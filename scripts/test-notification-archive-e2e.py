"""Verify notification pagination, filters, counts, archive and restore with a synthetic API."""
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

from browser_fixture import browser_fixture

NOW = datetime(2026, 11, 23, 12, tzinfo=timezone.utc)
PREVIOUS_MONTH = datetime(2026, 10, 15, 12, tzinfo=timezone.utc)


def row(id, title, created, **overrides):
    return dict(id=id, title=title, content=f'Nội dung {title}', userId='account-a',
                createdAt=created.isoformat(), status='READ', severity='NORMAL',
                channel='IN_APP', sentAt=None, readAt=None, incidentId=None,
                templateId=None, archivedAt=None) | overrides


rows = [row(f'inbox-{i}', f'Tin mới {i}', NOW - timedelta(seconds=i)) for i in range(112)]
rows += [row(f'archive-{i}', f'Tin đã lưu {i}', NOW - timedelta(days=1, seconds=i),
             archivedAt=NOW.isoformat()) for i in range(110)]
rows += [
    row('old-inbox', 'Thông báo tháng trước', PREVIOUS_MONTH, status='SENT', severity='CRITICAL'),
    row('old-webhook', 'Bản ghi Webhook cũ', PREVIOUS_MONTH, channel='WEBHOOK', status='SENT', severity='HIGH'),
    row('old-webhook-archived', 'Webhook đã lưu tháng trước', PREVIOUS_MONTH, channel='WEBHOOK',
        severity='HIGH', archivedAt=NOW.isoformat()),
    row('other', 'Tin tài khoản khác', NOW, userId='account-b', status='SENT'),
]
reads, writes, errors = [], [], []
state = {'archive_fails': True}


def api(route):
    request = route.request
    url = urlparse(request.url)
    path = url.path.removeprefix('/api/v1')
    q = {key: value[0] for key, value in parse_qs(url.query).items()}
    user = request.headers.get('x-fixture-user', 'account-a')

    def ok(data, **extra):
        return route.fulfill(json=dict(success=True, data=data, **extra))

    inbox_channels = {'IN_APP', 'WEB'}
    owned = [item for item in rows if item['userId'] == user]
    if path == '/notifications' and request.method == 'GET':
        reads.append(q)
        archived = q.get('archived') == 'true'
        channels = {q['channel']} if 'channel' in q else inbox_channels
        entries = [item for item in owned if bool(item['archivedAt']) == archived and item['channel'] in channels]
        if 'search' in q:
            entries = [item for item in entries if q['search'].casefold() in (item['title'] + item['content']).casefold()]
        if 'isRead' in q:
            entries = [item for item in entries if (item['status'] == 'READ') == (q['isRead'] == 'true')]
        if 'severity' in q:
            entries = [item for item in entries if item['severity'] == q['severity']]
        if q.get('type') == 'ALERT':
            entries = [item for item in entries if item['severity'] in {'HIGH', 'CRITICAL'}]
        if 'fromDate' in q:
            entries = [item for item in entries if datetime.fromisoformat(item['createdAt']) >= parse_date(q['fromDate'])]
        if 'toDate' in q:
            entries = [item for item in entries if datetime.fromisoformat(item['createdAt']) <= parse_date(q['toDate'])]
        entries.sort(key=lambda item: item['createdAt'], reverse=True)
        page, limit = int(q['page']), int(q['limit'])
        total = len(entries)
        return ok(entries[(page - 1) * limit:page * limit],
                  meta=dict(page=page, limit=limit, total=total, totalPages=(total + limit - 1) // limit))
    if path == '/notifications/archive-read' and request.method == 'PATCH':
        writes.append(path)
        if state['archive_fails']:
            return route.fulfill(status=503, json=dict(success=False, message='Synthetic archive failure'))
        targets = [item for item in owned if item['status'] == 'READ' and not item['archivedAt']
                   and item['channel'] in inbox_channels]
        for item in targets:
            item['archivedAt'] = NOW.isoformat()
        return ok(dict(archivedCount=len(targets)))
    if path.startswith('/notifications/') and path.endswith('/unarchive') and request.method == 'PATCH':
        writes.append(path)
        item = next(item for item in owned if item['id'] == path.split('/')[-2])
        item['archivedAt'] = None
        return ok(dict(id=item['id']))
    return ok({} if path == '/system/public' else [])


def parse_date(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def navigate(page, url):
    page.goto(url)
    page.wait_for_load_state('networkidle')


with browser_fixture('scripts/notification-archive-fixture.tsx') as base, sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport=dict(width=1440, height=900))
    context.route('**/api/v1/**', api)
    page = context.new_page()
    page.clock.set_fixed_time(NOW)
    page.on('pageerror', lambda error: errors.append(str(error)))
    navigate(page, base)
    expect(page.get_by_test_id('source-total')).to_have_text('113')
    expect(page.get_by_test_id('unread')).to_have_text('1')
    kpis = page.get_by_role('region', name='Thống kê trung tâm thông báo')
    expect(kpis.get_by_text('113', exact=True)).to_be_visible()
    page.get_by_role('button', name='12', exact=True).click()
    expect(page.locator('article').get_by_role('heading', name='Thông báo tháng trước', exact=True)).to_be_visible()
    assert any(q.get('archived') == 'false' and q.get('page') == '12' and q.get('limit') == '10' for q in reads)

    month = '?period=month&fromDate=2026-10-01&toDate=2026-10-31'
    navigate(page, base + '/' + month)
    search = page.get_by_placeholder('Tìm kiếm theo tiêu đề, vị trí, camera...')
    expect(page.locator('article').get_by_role('heading', name='Thông báo tháng trước', exact=True)).to_be_visible()
    page.get_by_role('combobox').filter(has=page.locator('option[value=WEBHOOK]')).select_option('WEBHOOK')
    page.get_by_role('combobox').filter(has=page.locator('option[value=HIGH]')).select_option('HIGH')
    page.get_by_role('button', name='Chưa đọc', exact=True).click()
    with page.expect_response(lambda response: parse_qs(urlparse(response.url).query).get('search') == ['Bản ghi Webhook']):
        search.fill('Bản ghi Webhook')
    expect(page.locator('article').get_by_role('heading', name='Bản ghi Webhook cũ', exact=True)).to_be_visible()
    expected = dict(page='1', limit='10', search='Bản ghi Webhook', isRead='false', severity='HIGH',
                    channel='WEBHOOK', fromDate='2026-09-30T17:00:00.000Z',
                    toDate='2026-10-31T16:59:59.999Z')
    assert expected | {'archived': 'false'} in reads, reads[-10:]

    page.get_by_role('tab', name='Lưu trữ', exact=True).click()
    page.get_by_role('button', name='Đã đọc', exact=True).click()
    with page.expect_response(lambda response: parse_qs(urlparse(response.url).query).get('search') == ['Webhook đã lưu']):
        search.fill('Webhook đã lưu')
    archive = page.get_by_role('region', name='Lưu trữ', exact=True)
    expect(archive.get_by_role('heading', name='Webhook đã lưu tháng trước', exact=True)).to_be_visible()
    assert expected | {'archived': 'true', 'isRead': 'true', 'search': 'Webhook đã lưu'} in reads, reads[-10:]

    navigate(page, base + '/?tab=archive')
    archive.get_by_role('button', name='11', exact=True).click()
    expect(archive.get_by_role('heading', name='Tin đã lưu 109', exact=True)).to_be_visible()
    assert any(q.get('archived') == 'true' and q.get('page') == '11' and q.get('limit') == '10' for q in reads)

    page.get_by_role('tab', name='Hộp thư').click()
    search.fill('Tin mới 0')
    expect(page.locator('article').get_by_role('heading', name='Tin mới 0', exact=True)).to_be_visible()
    page.get_by_role('button', name='Dọn mục đã đọc', exact=True).click()
    confirm = page.get_by_role('alertdialog')
    expect(confirm).to_contain_text('tất cả thông báo đã đọc thuộc kênh In-App và Web')
    expect(confirm).to_contain_text('ngoài bộ lọc hiện tại')
    move = confirm.get_by_role('button', name='Chuyển vào Lưu trữ')
    move.click()
    expect(confirm.get_by_role('alert')).to_contain_text('trên máy chủ')
    state['archive_fails'] = False
    move.click()
    expect(confirm).to_have_count(0)
    expect(page.get_by_text('Đã chuyển 112 thông báo vào Lưu trữ.', exact=True)).to_be_visible()
    expect(page.get_by_test_id('source-total')).to_have_text('1')
    expect(page.get_by_test_id('unread')).to_have_text('1')

    page.get_by_role('tab', name='Lưu trữ', exact=True).click()
    archive.get_by_role('heading', name='Tin mới 0', exact=True).click()
    detail = page.get_by_role('dialog', name='Thông báo đã lưu trữ')
    detail.get_by_role('button', name='Khôi phục về Hộp thư').click()
    expect(detail).to_have_count(0)
    page.get_by_role('tab', name='Hộp thư').click()
    expect(page.locator('article').get_by_role('heading', name='Tin mới 0', exact=True)).to_be_visible()
    expect(page.get_by_test_id('source-total')).to_have_text('2')

    assert writes == ['/notifications/archive-read', '/notifications/archive-read', '/notifications/inbox-0/unarchive']
    assert max(int(q['limit']) for q in reads) <= 20
    assert not errors, errors
    browser.close()
    print('PASS notification page: server pagination, filtered Webhook/date requests, full counts, archive error/retry and restore')
