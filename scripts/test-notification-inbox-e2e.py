"""Regression for duplicate broadcast deliveries. All APIs are synthetic; no real mutation occurs."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

from browser_fixture import browser_fixture

artifacts = Path('/tmp/ppe-notification-inbox-e2e')
artifacts.mkdir(parents=True, exist_ok=True)
GLOBAL = '00000000-0000-0000-0000-000000000000'
def row(id, owner, **extra):
    return dict(dict(id=id, userId=owner, title='Thông báo thử', content='Kiểm tra PPE', channel='IN_APP', status='SENT', severity='NORMAL', incidentId=None, templateId=None, sentAt='2026-11-18T09:00:00Z', readAt=None, createdAt='2026-11-18T09:00:00Z', isRead=False), **extra)
records = [row(f'owned-{n}', 'account-a', title=f'Sự cố {n}', incidentId=f'incident-{n}', createdAt=(datetime(2026,11,17,9,tzinfo=timezone.utc)-timedelta(seconds=n)).isoformat()) for n in range(105)]
# Split the pair over two server pages. UI ordering/filtering uses the completed snapshot.
records.insert(99, row('global-pair', GLOBAL))
records.insert(100, row('personal-pair', 'account-a'))
records.append(row('global-only', GLOBAL, title='Bản tin cho tài khoản mới'))
writes, errors, reads = [], [], []
state = {'fail_page': False, 'fail_delete': False}
def api(route):
    req = route.request
    parsed = urlparse(req.url)
    path, q = parsed.path.removeprefix('/api/v1'), parse_qs(parsed.query)
    user = req.headers.get('x-fixture-user', 'account-a')
    def ok(data, meta=None):
        body = dict(success=True, data=data)
        if meta is not None: body['meta'] = meta
        route.fulfill(json=body)
    if path == '/system/public': return ok({})
    if path == '/auth/me': return ok(dict(id=user, role='ADMIN', siteIds=[]))
    if path in ('/sites', '/cameras', '/incidents'):
        return ok([], dict(page=1, limit=int(q.get('limit', ['100'])[0]), total=0, totalPages=0))
    if path == '/notifications':
        page, limit = int(q['page'][0]), int(q['limit'][0])
        reads.append((user, page))
        if state['fail_page'] and q.get('toDate'): return route.fulfill(status=503, json=dict(success=False, code='ERROR', message='Synthetic page failure'))
        rows = [r for r in records if r['userId'] in (user, GLOBAL)]
        if q.get('toDate'):
            end = datetime.fromisoformat(q['toDate'][0].replace('Z','+00:00'))
            rows = [r for r in rows if datetime.fromisoformat(r['createdAt'].replace('Z','+00:00')) <= end]
        rows.sort(key=lambda r: r['createdAt'], reverse=True)
        return ok(rows[(page-1)*limit:page*limit], dict(page=page, limit=limit, total=len(rows), totalPages=(len(rows)+limit-1)//limit))
    if req.method != 'GET':
        writes.append((user, req.method, path))
        if path.endswith('/read-all'):
            for r in records:
                if r['userId'] == user: r['status'], r['isRead'] = 'READ', True
            return ok(dict(message='OK'))
        id = path.split('/')[-2] if path.endswith('/read') else path.split('/')[-1]
        target = next((r for r in records if r['id'] == id), None)
        assert target and target['userId'] == user, 'frontend must not mutate shared/global rows'
        if req.method == 'DELETE':
            if state['fail_delete']: return route.fulfill(status=503, json=dict(success=False, code='ERROR', message='Delete failed'))
            records.remove(target)
        else: target['status'], target['isRead'] = 'READ', True
        return ok(dict(message='OK'))
    raise AssertionError((req.method, path))

with browser_fixture('scripts/notification-inbox-fixture.tsx') as base, sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport=dict(width=1366, height=900))
    page.route('**/api/v1/**', api)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base)
    expect(page.get_by_test_id('total')).to_have_text('107')
    expect(page.get_by_test_id('unread')).to_have_text('107')
    assert len(reads) == 2, 'list, sidebar count and bell share the same fetch'
    page.get_by_label('Search', exact=True).fill('Thông báo thử')
    expect(page.locator('article')).to_have_count(1)
    expect(page.get_by_test_id('total')).to_have_text('1')
    page.locator('#notification-bell-btn').click()
    expect(page.get_by_text('Thông báo thử', exact=True)).to_have_count(2)  # one inbox card, one bell item
    page.locator('#notification-bell-btn').click()
    page.locator('article').get_by_role('button', name='Đánh dấu đã đọc', exact=True).click()
    expect(page.get_by_test_id('unread')).to_have_text('106')
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
    expect(page.locator('article')).to_have_count(0)
    page.reload()
    page.get_by_label('Search', exact=True).fill('Thông báo thử')
    expect(page.get_by_test_id('total')).to_have_text('0')
    expect(page.locator('article')).to_have_count(0)
    # A legitimate subsequent send of the same content must still appear.
    records.extend([row('later-global', GLOBAL, createdAt='2026-11-18T09:01:00Z'), row('later-personal', 'account-a', createdAt='2026-11-18T09:01:00Z')])
    page.get_by_role('button', name='Refresh inbox').click()
    expect(page.locator('article')).to_have_count(1)
    expect(page.get_by_test_id('total')).to_have_text('1')
    page.set_viewport_size(dict(width=390, height=844))
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(artifacts / 'deduplicated-mobile.png'), full_page=True)
    # A shared-only broadcast is read/deleted locally, scoped to this account.
    page.get_by_label('Search', exact=True).fill('Bản tin cho tài khoản mới')
    expect(page.locator('article')).to_have_count(1)
    before = len(writes)
    page.locator('article').get_by_role('button', name='Đánh dấu đã đọc', exact=True).click()
    page.locator('article').get_by_role('button', name='Xóa thông báo', exact=True).click()
    expect(page.locator('article')).to_have_count(0)
    assert len(writes) == before
    page.get_by_label('Account', exact=True).select_option('account-b')
    page.get_by_label('Search', exact=True).fill('Bản tin cho tài khoản mới')
    expect(page.locator('article')).to_have_count(1)
    expect(page.get_by_test_id('unread')).to_have_text('3')
    # Incomplete pages must produce an error rather than a partial, apparently complete inbox.
    page.get_by_label('Account', exact=True).select_option('account-a')
    state['fail_page'] = True
    page.get_by_role('button', name='Refresh inbox').click()
    expect(page.get_by_role('alert').filter(has_text='Không tải được đầy đủ hộp thư.')).to_be_visible(timeout=15000)
    # Cached counts must survive a background failure.
    expect(page.get_by_test_id('unread')).not_to_have_text('0')
    page.screenshot(path=str(artifacts / 'retained-counts-on-error.png'), full_page=True)
    # A fresh tab has no cached inbox: show unknown values, not invented zero counts.
    fresh = browser.new_page(viewport=dict(width=1366,height=900))
    fresh.route('**/api/v1/**', api)
    fresh.goto(base)
    expect(fresh.get_by_role('alert').filter(has_text='Không tải được đầy đủ hộp thư.')).to_be_visible(timeout=15000)
    kpis = fresh.get_by_role('region', name='Thống kê trung tâm thông báo')
    expect(kpis.get_by_text('—', exact=True)).to_have_count(4)
    expect(kpis).not_to_contain_text('100%')
    fresh.screenshot(path=str(artifacts / 'unknown-counts-on-error.png'), full_page=True)
    fresh.close()
    state['fail_page'] = False
    page.get_by_role('button', name='Thử lại', exact=True).click()
    expect(page.get_by_role('alert').filter(has_text='Không tải được đầy đủ hộp thư.')).to_have_count(0)
    assert not errors, errors
    assert all('global' not in path for _, _, path in writes)
    browser.close()
    (artifacts / 'result.json').write_text(json.dumps(dict(passed=True, writes=writes, errors=errors), indent=2))
    print('PASS: cross-page pair deduplication, totals/unread/bell, filters, read/delete failure/retry, reload, repeated sends, shared-only/account isolation, errors and mobile.')
