"""Verify server-backed inbox filters, read/delete actions, retry and account isolation."""
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

from browser_fixture import browser_fixture


def row(id, owner='account-a', **extra):
    return dict(id=id, userId=owner, title='Thông báo thử', content='Kiểm tra PPE', channel='IN_APP',
                status='SENT', severity='NORMAL', incidentId=None, templateId=None,
                sentAt=None, readAt=None, createdAt='2026-11-18T09:00:00Z', isRead=False) | extra


records = [
    row(f'owned-{i}', title=f'Sự cố {i}',
        createdAt=(datetime(2026, 11, 17, 9, tzinfo=timezone.utc) - timedelta(seconds=i)).isoformat())
    for i in range(105)
]
records += [row('target', title='Thông báo cần xử lý'), row('other', 'account-b', title='Tin tài khoản khác')]
reads, writes, errors = [], [], []
state = {'fail_list': False, 'fail_delete': False}


def api(route):
    req = route.request
    parsed = urlparse(req.url)
    path, q = parsed.path.removeprefix('/api/v1'), parse_qs(parsed.query)
    user = req.headers.get('x-fixture-user', 'account-a')

    def ok(data, **extra):
        return route.fulfill(json=dict(success=True, data=data, **extra))

    def unavailable(message):
        return route.fulfill(status=503, json=dict(success=False, code='ERROR', message=message))

    if path == '/notifications' and req.method == 'GET':
        page, limit = int(q['page'][0]), int(q['limit'][0])
        reads.append((user, q))
        if state['fail_list']:
            return unavailable('Synthetic list failure')
        items = [item for item in records if item['userId'] == user]
        if q.get('search'):
            term = q['search'][0].casefold()
            items = [item for item in items if term in (item['title'] + item['content']).casefold()]
        if q.get('isRead'):
            items = [item for item in items if item['isRead'] == (q['isRead'] == ['true'])]
        items.sort(key=lambda item: item['createdAt'], reverse=True)
        return ok(items[(page - 1) * limit:page * limit],
                  meta=dict(page=page, limit=limit, total=len(items), totalPages=(len(items) + limit - 1) // limit))
    if path == '/notifications/read-all' and req.method == 'PATCH':
        writes.append((user, req.method, path))
        for item in records:
            if item['userId'] == user:
                item.update(status='READ', isRead=True)
        return ok(dict(message='OK'))
    if path.startswith('/notifications/') and req.method in {'PATCH', 'DELETE'}:
        writes.append((user, req.method, path))
        id = path.split('/')[-2] if path.endswith('/read') else path.split('/')[-1]
        item = next(item for item in records if item['id'] == id and item['userId'] == user)
        if req.method == 'DELETE':
            if state['fail_delete']:
                return unavailable('Delete failed')
            records.remove(item)
        else:
            item.update(status='READ', isRead=True)
        return ok(dict(message='OK'))
    return ok({} if path == '/system/public' else [])


with browser_fixture('scripts/notification-inbox-fixture.tsx') as base, sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport=dict(width=1366, height=900))
    page.route('**/api/v1/**', api)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_test_id('total')).to_have_text('106')
    expect(page.get_by_test_id('unread')).to_have_text('106')

    page.get_by_role('button', name='11', exact=True).click()
    expect(page.locator('article').get_by_role('heading', name='Sự cố 104')).to_be_visible()
    search = page.get_by_label('Search', exact=True)
    search.fill('Thông báo cần xử lý')
    expect(page.get_by_test_id('total')).to_have_text('1')
    assert any(q.get('page') == ['1'] and q.get('search') == ['Thông báo cần xử lý'] for _, q in reads)

    page.locator('article').get_by_role('button', name='Đánh dấu đã đọc', exact=True).click()
    expect(page.get_by_test_id('unread')).to_have_text('105')
    page.get_by_label('Read filter').select_option('unread')
    expect(page.locator('article')).to_have_count(0)
    page.get_by_label('Read filter').select_option('all')
    expect(page.locator('article')).to_have_count(1)

    state['fail_delete'] = True
    page.locator('article').get_by_role('button', name='Xóa thông báo', exact=True).click()
    expect(page.get_by_text('Delete failed', exact=True).first).to_be_visible()
    expect(page.locator('article')).to_have_count(1)
    state['fail_delete'] = False
    page.locator('article').get_by_role('button', name='Xóa thông báo', exact=True).click()
    expect(page.get_by_test_id('total')).to_have_text('0')
    expect(page.locator('article')).to_have_count(0)

    page.get_by_role('button', name='Read all', exact=True).click()
    expect(page.get_by_test_id('unread')).to_have_text('0')
    page.get_by_label('Account', exact=True).select_option('account-b')
    expect(page.get_by_test_id('total')).to_have_text('1')
    expect(page.get_by_test_id('unread')).to_have_text('1')
    expect(page.locator('article').get_by_role('heading', name='Tin tài khoản khác')).to_be_visible()

    state['fail_list'] = True
    page.get_by_role('button', name='Refresh inbox').click()
    expect(page.get_by_role('alert').filter(has_text='Không tải được danh sách thông báo.')).to_be_visible()
    expect(page.get_by_test_id('total')).to_have_text('1')
    state['fail_list'] = False
    page.get_by_role('button', name='Thử lại', exact=True).click()
    expect(page.get_by_role('alert').filter(has_text='Không tải được danh sách thông báo.')).to_have_count(0)

    page.set_viewport_size(dict(width=390, height=844))
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert writes == [
        ('account-a', 'PATCH', '/notifications/target/read'),
        ('account-a', 'DELETE', '/notifications/target'),
        ('account-a', 'DELETE', '/notifications/target'),
        ('account-a', 'PATCH', '/notifications/read-all'),
    ]
    assert not errors, errors
    browser.close()
    print('PASS inbox: server paging and filters, read/delete, read-all, account isolation, retry and mobile')
