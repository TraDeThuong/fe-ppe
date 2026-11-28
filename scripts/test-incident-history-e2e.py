"""Exercise the production incident queues with synthetic incidents and write assertions."""
from datetime import datetime, timedelta, timezone
from collections import Counter
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

from browser_fixture import browser_fixture


def uuid(value):
    return f'00000000-0000-4000-8000-{value:012x}'


SITE, CAMERA, MANAGER = uuid(400), uuid(300), uuid(200)
OLD = datetime(2025, 1, 1, tzinfo=timezone.utc)
CLOSED_AT = '2026-11-23T01:00:00Z'


def incident(number, status, description, detected=OLD):
    timestamp = detected.isoformat()
    return dict(id=uuid(number), siteId=SITE, siteName='Công trường A', cameraId=CAMERA, cameraCode='CAM-01',
                status=status, severity='HIGH', violationType='NO_HELMET', description=description,
                createdAt=timestamp, updatedAt=timestamp, detectedAt=timestamp, assignments=[],
                evidences=[], statusHistory=[])


records = {record['id']: record for record in [
    incident(1, 'PENDING_REVIEW', 'Hồ sơ cũ chờ duyệt'),
    incident(2, 'CONFIRMED', 'Thành viên còn xử lý', OLD + timedelta(seconds=1)),
    incident(3, 'DISMISSED', 'Hồ sơ bác bỏ chờ đóng'),
    incident(4, 'RESOLVED', 'Hồ sơ cuối trang'),
    incident(5, 'CLOSED', 'Hồ sơ đã đóng đời cũ'),
    *[incident(10 + count, 'RESOLVED', f'Hồ sơ nghiệm thu {count}', OLD + timedelta(days=count + 1)) for count in range(10)],
]}
for number in (2, 4):
    records[uuid(number)]['evidences'] = [dict(id=uuid(500 + number), incidentId=uuid(number), cameraId=CAMERA,
                                             evidenceType='SNAPSHOT', fileName='evidence.png',
                                             storageKey='test_frame_track7_abcdef.png', capturedAt=OLD.isoformat())]
records[uuid(10)].update(severity='CRITICAL', violationType='NO_VEST', trackId=4)
records[uuid(11)].update(severity='CRITICAL', violationType='NO_HELMET', trackId=4,
                         detectedAt=records[uuid(10)]['detectedAt'])

writes, requests, page_errors = [], [], []
fail_close = True
fail_counts = False


def api(route):
    request = route.request
    url = urlparse(request.url)
    path, params = url.path.removeprefix('/api/v1'), parse_qs(url.query)
    requests.append((path, params))

    def ok(data, meta=None):
        response = dict(success=True, data=data)
        if meta is not None:
            response['meta'] = meta
        route.fulfill(json=response)

    def paginated(rows):
        page, limit = int(params.get('page', ['1'])[0]), int(params.get('limit', ['100'])[0])
        count = len(rows)
        ok(rows[(page - 1) * limit:page * limit], dict(page=page, limit=limit, total=count, totalPages=(count + limit - 1) // limit))

    if request.method != 'GET':
        writes.append((request.method, path))
        assert request.method == 'POST' and path.endswith('/close'), writes
        record = records[path.split('/')[-2]]
        if fail_close:
            return route.fulfill(status=409, json=dict(success=False, message='Fixture close rejected', code='FIXTURE_ERROR'))
        record['statusHistory'].append(dict(id=uuid(700 + len(writes)), incidentId=record['id'],
                                            oldStatus=record['status'], newStatus='CLOSED', changedAt=CLOSED_AT,
                                            changedBy=MANAGER, reason='Đã kiểm tra hồ sơ'))
        record['status'] = 'CLOSED'
        return ok(record)

    if path in ('/incidents', '/incidents/status-counts'):
        rows = list(records.values())
        for field in ('siteId', 'cameraId', 'status', 'severity', 'violationType'):
            if field in params:
                rows = [record for record in rows if record[field] == params[field][0]]
        if 'search' in params:
            rows = [record for record in rows if params['search'][0].lower() in record['description'].lower()]
        if params.get('assignedToMe') == ['true']:
            # BE develop không còn assignmentScope; lịch sử dùng includeAllAssignments.
            assert 'assignmentScope' not in params, params
            rows = [record for record in rows if record['id'] in (uuid(2), uuid(11))]
        if path == '/incidents/status-counts':
            if fail_counts:
                return route.fulfill(status=503, json=dict(success=False, message='Fixture stats unavailable'))
            statuses = Counter(record['status'] for record in rows)
            severities = Counter(record['severity'] for record in rows)
            closed_from = Counter(record['statusHistory'][-1]['oldStatus'] for record in rows
                                  if record['status'] == 'CLOSED' and record['statusHistory'])
            return ok(dict(total=len(rows), pendingReview=statuses['PENDING_REVIEW'],
                           confirmed=statuses['CONFIRMED'], critical=severities['CRITICAL'],
                           resolved=statuses['RESOLVED'] + statuses['CLOSED'], closed=statuses['CLOSED'],
                           dismissed=statuses['DISMISSED'], bySeverity=dict(severities),
                           byViolationType=dict(Counter(record['violationType'] for record in rows)),
                           remediated=statuses['RESOLVED'] + closed_from['RESOLVED'],
                           falseAlarms=statuses['DISMISSED'] + closed_from['DISMISSED']))
        rows.sort(key=lambda record: record['detectedAt'], reverse=True)
        return paginated(rows)
    if path.startswith('/incidents/') and path.split('/')[-1] in records:
        return ok(records[path.split('/')[-1]])
    if path == '/sites':
        return paginated([dict(id=SITE, name='Công trường A', code='SITE-A', status='ACTIVE', createdAt=OLD.isoformat())])
    if path == '/cameras':
        return paginated([dict(id=CAMERA, siteId=SITE, name='Cổng chính', code='CAM-01', status='ONLINE')])
    if path in ('/system/public', '/auth/me'):
        return ok({})
    return paginated([])


def tab(page, name):
    controls = page.get_by_label('Điều khiển danh sách sự cố')
    return controls.get_by_role('button', name=name, exact=True)


def row(page, description):
    return page.get_by_role('row').filter(has_text=description)


def open_close(page, description):
    trigger = row(page, description).get_by_role('button', name='Thao tác', exact=True)
    trigger.evaluate("element => element.scrollIntoView({ block: 'center', behavior: 'instant' })")
    expect(trigger).to_be_enabled()
    trigger.click()
    page.get_by_role('menu', name='Thao tác').get_by_role('menuitem', name='Đóng sự cố', exact=True).click()
    return page.get_by_role('dialog').get_by_role('button', name='Xác nhận đóng hồ sơ', exact=True)


with browser_fixture('scripts/incident-group-fixture.tsx', spa=True) as base, sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport=dict(width=1440, height=1000))
    context.route('**/api/v1/**', api)
    page = context.new_page()
    page.on('pageerror', lambda error: page_errors.append(str(error)))
    page.goto(base + '/incidents')
    expect(tab(page, 'Chờ thẩm duyệt')).to_have_attribute('aria-pressed', 'true')
    expect(row(page, 'Hồ sơ cũ chờ duyệt')).to_be_visible()
    expect(row(page, 'Thành viên còn xử lý')).to_have_count(0)
    kpi = page.get_by_text('Tổng sự cố', exact=True).first.locator('..')
    expect(kpi).to_contain_text('15')
    resolved_kpi = page.get_by_text('Đã giải quyết', exact=True).first.locator('..')
    expect(resolved_kpi).to_contain_text('11')

    tab(page, 'Đã xác nhận').click()
    expect(row(page, 'Thành viên còn xử lý')).to_be_visible()
    tab(page, 'Đã bác bỏ, chờ đóng').click()
    expect(row(page, 'Hồ sơ bác bỏ chờ đóng')).to_be_visible()
    tab(page, 'Lịch sử').click()
    expect(row(page, 'Hồ sơ đã đóng đời cũ')).to_contain_text('Đã đóng')
    expect(row(page, 'Hồ sơ đã đóng đời cũ').locator('time')).to_have_count(0)
    expect(page.get_by_role('table').get_by_role('checkbox')).to_have_count(0)
    tab(page, 'Tất cả').click()
    expect(page.get_by_role('button', name='Trang tiếp theo')).to_be_enabled()
    assert not writes, writes
    assert any(path == '/incidents' and 'status' not in params for path, params in requests)
    expect(kpi).to_contain_text('15')

    tab(page, 'Tác nghiệp').click()
    tab(page, 'Chờ nghiệm thu').click()
    page.get_by_role('button', name='Trang tiếp theo').click()
    expect(row(page, 'Hồ sơ cuối trang')).to_be_visible()
    confirm = open_close(page, 'Hồ sơ cuối trang')
    confirm.click()
    expect(page.get_by_text('Fixture close rejected', exact=True).last).to_be_visible()
    expect(row(page, 'Hồ sơ cuối trang')).to_be_visible()
    assert records[uuid(4)]['status'] == 'RESOLVED'

    fail_close = False
    confirm.click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(row(page, 'Hồ sơ cuối trang')).to_have_count(0)
    expect(row(page, 'Hồ sơ nghiệm thu 9')).to_be_visible()
    expect(page.get_by_role('button', name='Trang tiếp theo')).to_be_disabled()
    page.get_by_role('link', name='Xem Lịch sử', exact=True).click()
    expect(tab(page, 'Lịch sử')).to_have_attribute('aria-pressed', 'true')
    accepted = row(page, 'Hồ sơ cuối trang')
    expect(accepted).to_contain_text('Đóng sau nghiệm thu')
    expect(accepted.locator('time')).to_have_attribute('datetime', CLOSED_AT)
    expect(kpi).to_contain_text('15')

    accepted.get_by_role('link', name='#00000000').click()
    expect(page).to_have_url(base + f'/incidents/{uuid(4)}')
    expect(page.get_by_text('evidence.png', exact=True).first).to_be_attached()
    page.get_by_role('button', name='Incidents', exact=True).click()
    tab(page, 'Đã xác nhận').click()
    page.get_by_role('button', name='Gom đa sự cố', exact=False).click()
    expect(page.locator(f'a[href="/incidents/{uuid(2)}"]').first).to_be_visible()
    expect(page.locator(f'a[href="/incidents/{uuid(4)}"]')).to_have_count(0)
    page.get_by_role('button', name='Bảng', exact=True).click()
    tab(page, 'Đã bác bỏ, chờ đóng').click()
    open_close(page, 'Hồ sơ bác bỏ chờ đóng').click()
    page.get_by_role('link', name='Xem Lịch sử', exact=True).click()
    expect(row(page, 'Hồ sơ bác bỏ chờ đóng')).to_contain_text('Đóng sau bác bỏ')

    # The same aggregate is used in the card, drill-down, breakdown, and mobile lane.
    page.get_by_text('Vi phạm khẩn cấp', exact=True).first.click()
    expect(page.get_by_role('heading', name='Sự cố vi phạm khẩn cấp')).to_be_visible()
    expect(page.get_by_text('Cao', exact=True).first.locator('..')).to_contain_text('13')
    expect(page.get_by_text('Vi phạm khẩn cấp', exact=True).first.locator('..')).to_contain_text('2')
    expect(page.get_by_text('Vi phạm khẩn cấp trên trang này', exact=True).locator('..')).to_contain_text('2 vụ việc')
    assert not any(path == '/incidents/status-counts' and 'status' in params for path, params in requests)

    page.get_by_text('Đã giải quyết', exact=True).first.click()
    expect(page.get_by_text('Tổng sự cố đã khắc phục', exact=True).locator('..')).to_contain_text('11')
    expect(page.get_by_text('Tỷ lệ khắc phục an toàn', exact=True).locator('..')).to_contain_text('73%')
    expect(page.get_by_text('Cảnh báo ảo loại trừ', exact=True).locator('..')).to_contain_text('1')
    expect(page.get_by_text('Hồ sơ chờ nghiệm thu trên trang này', exact=True).locator('..')).to_contain_text('8 hồ sơ')
    expect(resolved_kpi).to_contain_text('10')
    page.set_viewport_size(dict(width=390, height=844))
    expect(page.get_by_role('button', name='Chờ nghiệm thu', exact=False)).to_contain_text('10')
    page.set_viewport_size(dict(width=1440, height=1000))

    search = page.get_by_placeholder('Tìm theo mã sự cố, camera, mô tả...')
    search.fill('Hồ sơ nghiệm thu 9')
    expect(kpi.locator('p')).to_have_text('1')
    expect(resolved_kpi.locator('p')).to_have_text('1')
    assert any(path == '/incidents/status-counts' and params.get('search') == ['Hồ sơ nghiệm thu 9']
               for path, params in requests)
    fail_counts = True
    search.fill('Hồ sơ nghiệm thu 8')
    expect(page.get_by_text('Không tải được số liệu thống kê sự cố.')).to_be_visible()
    expect(kpi).to_contain_text('—')
    expect(row(page, 'Hồ sơ nghiệm thu 8')).to_be_visible()
    fail_counts = False

    page.goto(base + '/incidents?assignedToMe=true')
    expect(kpi.locator('p')).to_have_text('2')
    expect(resolved_kpi.locator('p')).to_have_text('1')
    page.get_by_text('Đã giải quyết', exact=True).first.click()
    expect(resolved_kpi.locator('p')).to_have_text('1')
    expect(row(page, 'Hồ sơ nghiệm thu 1')).to_be_visible()

    page.goto(base + f'/incidents?status=CLOSED&siteId={SITE}&cameraId={CAMERA}')
    expect(tab(page, 'Lịch sử')).to_have_attribute('aria-pressed', 'true')
    expect(row(page, 'Hồ sơ cuối trang')).to_be_visible()
    assert any(path == '/incidents' and query.get('siteId') == [SITE] and query.get('cameraId') == [CAMERA]
               and query.get('status') == ['CLOSED'] for path, query in requests)

    page.get_by_label('Test account').select_option('officer')
    page.get_by_role('button', name='Incidents', exact=True).click()
    expect(tab(page, 'Đã xác nhận')).to_have_attribute('aria-pressed', 'true')
    expect(row(page, 'Thành viên còn xử lý')).to_be_visible()
    page.get_by_role('button', name='Toggle read permission').click()
    expect(page.get_by_role('alert')).to_contain_text('Bạn không có quyền xem danh sách sự cố.')
    expect(page.get_by_role('table')).to_have_count(0)
    assert writes == [('POST', f'/incidents/{uuid(4)}/close')] * 2 + [('POST', f'/incidents/{uuid(3)}/close')], writes
    assert not page_errors, page_errors
    browser.close()
    print('Incident history E2E passed')
