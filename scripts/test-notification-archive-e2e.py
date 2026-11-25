"""Exercise the production notification page and archive scheduler against synthetic APIs."""
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

from browser_fixture import browser_fixture

NOW = datetime(2026, 11, 23, 12, tzinfo=timezone.utc)
GLOBAL = '00000000-0000-0000-0000-000000000000'


def row(id, title, created, owner='account-a', **overrides):
    return dict(id=id, title=title, content=f'Nội dung {title}', userId=owner,
                createdAt=created.isoformat(), status='READ', severity='NORMAL',
                channel='IN_APP', sentAt=None, readAt=None, incidentId=None,
                templateId=None) | overrides


rows = [row(f'read-{index}', f'Tin đọc {index}', NOW - timedelta(days=1, seconds=index)) for index in range(104)]
rows += [
    {**rows[0], 'id': 'same-delivery-email', 'channel': 'EMAIL'},
    row('unread', 'Cảnh báo cũ chưa đọc', NOW - timedelta(days=50), status='SENT', severity='CRITICAL'),
    row('expired', 'Tin quá hạn', NOW - timedelta(days=7, milliseconds=1)),
    row('boundary', 'Tin đúng mốc', NOW - timedelta(days=7)),
    row('recent', 'Tin mới', NOW - timedelta(days=6, hours=12)),
    row('broadcast', 'Tin phát chung', NOW - timedelta(days=2), owner=GLOBAL),
    row('owned-broadcast', 'Tin phát chung', NOW - timedelta(days=2)),
    row('other', 'Tin tài khoản khác', NOW, owner='account-b', status='SENT'),
]
writes = []
page_errors = []
fail_inbox_page = False


def api(route):
    request = route.request
    url = urlparse(request.url)
    path, params = url.path.removeprefix('/api/v1'), parse_qs(url.query)
    if request.method != 'GET':
        writes.append((request.method, path))
        return route.fulfill(status=405, json={'success': False})
    if path == '/notifications':
        user = request.headers['x-fixture-user']
        entries = [item for item in rows if item['userId'] in (user, GLOBAL)]
        if 'toDate' in params:
            if fail_inbox_page:
                return route.fulfill(status=503, json={'success': False, 'message': 'Synthetic page failure'})
            end = datetime.fromisoformat(params['toDate'][0].replace('Z', '+00:00'))
            entries = [item for item in entries if datetime.fromisoformat(item['createdAt']) <= end]
        entries.sort(key=lambda item: item['createdAt'], reverse=True)
        limit, page = int(params['limit'][0]), int(params['page'][0])
        total = len(entries)
        return route.fulfill(json={'success': True, 'data': entries[(page - 1) * limit:page * limit],
                                   'meta': dict(page=page, limit=limit, total=total, totalPages=(total + limit - 1) // limit)})
    if path == '/system/public':
        return route.fulfill(json={'success': True, 'data': {}})
    return route.fulfill(json={'success': True, 'data': [], 'meta': dict(page=1, limit=100, total=0, totalPages=0)})


def open_page(context, base, mobile=False):
    page = context.new_page()
    if mobile:
        page.set_viewport_size(dict(width=390, height=844))
    page.clock.set_fixed_time(NOW)
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(base)
    expect(page.get_by_test_id('source-total')).to_have_text('109')
    return page


def tab(page, name):
    return page.get_by_role('tab', name=name, exact=True)


def archive_list(page):
    return page.get_by_role('region', name='Lưu trữ', exact=True)


with browser_fixture('scripts/notification-archive-fixture.tsx') as base, sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport=dict(width=1440, height=900))
    context.route('**/api/v1/**', api)
    page = open_page(context, base)
    peer = open_page(context, base, mobile=True)

    search = page.get_by_placeholder('Tìm kiếm theo tiêu đề, vị trí, camera...')
    search.fill('Cảnh báo cũ chưa đọc')
    clean = page.get_by_role('button', name='Dọn mục đã đọc', exact=True)
    refresh = page.get_by_role('button', name='Làm mới danh sách', exact=True)
    fail_inbox_page = True
    refresh.click()
    expect(page.get_by_text('Không tải được đầy đủ hộp thư.', exact=False).last).to_be_visible()
    expect(clean).to_be_disabled()
    expect(page.get_by_test_id('source-total')).to_have_text('109')
    fail_inbox_page = False
    refresh.click()
    expect(clean).to_be_enabled()
    clean.click()
    confirm = page.get_by_role('alertdialog')
    expect(confirm).to_contain_text('108 thông báo đã đọc từ toàn bộ hộp thư')

    page.evaluate("""() => {
      window.originalArchivePut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'accounts') throw new DOMException('Synthetic quota error', 'QuotaExceededError');
        return window.originalArchivePut.apply(this, args);
      };
    }""")
    confirm.get_by_role('button', name='Chuyển vào Lưu trữ').click()
    expect(confirm.get_by_role('alert')).to_contain_text('Không truy cập được Lưu trữ')
    page.evaluate('() => { IDBObjectStore.prototype.put = window.originalArchivePut; }')

    peer.get_by_placeholder('Tìm kiếm theo tiêu đề, vị trí, camera...').fill('Tin đọc 0')
    peer.locator('article').get_by_role('heading', name='Tin đọc 0', exact=True).click()
    expect(peer.get_by_role('dialog')).to_be_visible()
    confirm.get_by_role('button', name='Chuyển vào Lưu trữ').click()
    expect(page.get_by_text('Đã chuyển 108 thông báo vào Lưu trữ.', exact=True)).to_be_visible()
    expect(peer.get_by_role('dialog')).to_have_count(0)
    expect(page.get_by_test_id('source-total')).to_have_text('109')
    expect(page.get_by_test_id('unread')).to_have_text('1')
    expect(page.locator('#notification-bell-btn')).to_have_text('1')
    page.locator('#notification-bell-btn').click()
    expect(page.locator('nav').get_by_text('Cảnh báo cũ chưa đọc', exact=True)).to_be_visible()
    expect(page.locator('nav').get_by_text('Tin đọc 0', exact=True)).to_have_count(0)
    page.locator('#notification-bell-btn').click()

    tab(page, 'Lưu trữ').click()
    expect(archive_list(page).locator('article')).to_have_count(10)
    archive_list(page).get_by_role('button', name='Trang tiếp theo').click()
    expect(archive_list(page).get_by_role('heading', name='Tin đọc 10', exact=True)).to_be_visible()
    page.reload()
    expect(archive_list(page).get_by_role('heading', name='Tin đọc 0', exact=True)).to_be_visible()
    archive_list(page).get_by_role('heading', name='Tin đọc 0', exact=True).click()
    detail = page.get_by_role('dialog', name='Thông báo đã lưu trữ')
    expect(detail).to_contain_text('Nội dung Tin đọc 0')
    detail.get_by_role('button', name='Khôi phục về Hộp thư').click()
    expect(detail).to_have_count(0)
    expect(peer.locator('article').get_by_role('heading', name='Tin đọc 0', exact=True)).to_be_visible()
    expect(peer.get_by_role('dialog')).to_have_count(0)

    page.get_by_label('Account').select_option('account-b')
    expect(archive_list(page).get_by_text('Chưa có thông báo nào trong Lưu trữ.')).to_be_visible()
    expect(page.get_by_test_id('source-total')).to_have_text('2')
    page.get_by_label('Account').select_option('account-a')
    expect(archive_list(page).locator('article')).to_have_count(10)
    context.close()

    context = browser.new_context(viewport=dict(width=1440, height=900))
    context.route('**/api/v1/**', api)
    page = open_page(context, base)
    tab(page, 'Cài đặt kênh nhận tin').click()
    toggle = page.get_by_role('switch', name='Bật tự dọn')
    expect(toggle).to_have_attribute('aria-checked', 'false')
    days = page.get_by_label('Số ngày kể từ khi tạo')
    expect(days).to_have_value('30')
    days.fill('366')
    form = page.locator('form').filter(has=days)
    expect(form.get_by_role('button', name='Lưu', exact=True)).to_be_disabled()
    days.fill('7')
    toggle.click()
    form.get_by_role('button', name='Lưu', exact=True).click()
    expect(form.get_by_text('Kiểm tra gần nhất lúc', exact=False)).to_be_visible()
    tab(page, 'Lưu trữ').click()
    expect(archive_list(page).locator('article')).to_have_count(1)
    archive_list(page).get_by_role('heading', name='Tin quá hạn', exact=True).click()
    page.get_by_role('button', name='Khôi phục về Hộp thư').click()
    expect(archive_list(page).get_by_text('Chưa có thông báo nào trong Lưu trữ.')).to_be_visible()

    page.get_by_role('button', name='Go to dashboard').click()
    expect(page.get_by_role('heading', name='Dashboard fixture')).to_be_visible()
    page.clock.set_fixed_time(NOW + timedelta(days=1))
    page.evaluate('window.dispatchEvent(new Event("focus"))')
    # The second tab observes the dashboard scheduler through IndexedDB.
    observer = context.new_page()
    observer.clock.set_fixed_time(NOW)
    observer.goto(base + '/?tab=archive')
    expect(archive_list(observer).locator('article')).to_have_count(2)
    expect(archive_list(observer).get_by_role('heading', name='Tin đúng mốc', exact=True)).to_be_visible()
    expect(archive_list(observer).get_by_role('heading', name='Tin mới', exact=True)).to_be_visible()
    expect(archive_list(observer).get_by_role('heading', name='Tin quá hạn', exact=True)).to_have_count(0)
    expect(observer.get_by_test_id('unread')).to_have_text('1')

    assert writes == [], f'Cleanup must have no HTTP writes: {writes}'
    assert page_errors == [], page_errors
    context.close()
    browser.close()
    print('Notification archive E2E passed')
