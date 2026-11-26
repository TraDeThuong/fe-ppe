"""Browser regression tests against the real Next route; all API calls are mocked.
Run with the frontend already running: python3 scripts/test-scheduled-tasks-e2e.py
No cron job, cleanup, email, or backend mutation is executed.
"""
import argparse
import copy
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(line_buffering=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://localhost:3000')
parser.add_argument('--artifacts', default='/tmp/ppe-scheduled-tasks-e2e')
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
JOBS = [dict(name=name, description=description, cron=cron, isEnabled=index < 4, lastStatus='READY') for index, (name, description, cron) in enumerate([
    ('cleanup-audit-logs', 'Dọn audit logs cũ', '0 2 * * *'),
    ('cleanup-unconfirmed-uploads', 'Dọn file upload không liên kết', '0 3 * * *'),
    ('cleanup-expired-tokens', 'Dọn token hết hạn', '0 4 * * *'),
    ('daily-summary-digest', 'Tổng hợp hoạt động hằng ngày', '0 8 * * *'),
    ('weekly-summary-digest', 'Tổng hợp hoạt động hằng tuần', '0 8 * * 1'),
])]
JOBS[0].update(schedule=dict(frequency='DAILY', hour=2, minute=0),
               scheduleLabel='02:00 hàng ngày (UTC+7)', defaultParams=dict(retentionDays=30))


def apply_edit(job, payload):
    if 'schedule' in payload:
        schedule = payload['schedule']
        frequency = schedule['frequency']
        minute = schedule['minute']
        if frequency == 'HOURLY':
            hours = schedule['everyHours']
            cron = f'{minute} */{hours} * * *'
            label = f'Mỗi {hours} giờ (phút :{minute:02})'
        else:
            hour = schedule['hour']
            time = f'{hour:02}:{minute:02}'
            if frequency == 'WEEKLY':
                weekday = schedule['dayOfWeek']
                cron = f'{minute} {hour} * * {weekday}'
                label = f'{time} ' + ('Chủ nhật' if weekday == 0 else f'Thứ {weekday + 1}') + ' hàng tuần'
            elif frequency == 'MONTHLY':
                day = schedule['dayOfMonth']
                cron = f'{minute} {hour} {day} * *'
                label = f'{time} ngày {day} hàng tháng'
            else:
                cron = f'{minute} {hour} * * *'
                label = f'{time} hàng ngày'
        job.update(cron=cron, schedule=schedule, scheduleLabel=label + ' (UTC+7)')
    if 'defaultParams' in payload:
        job.setdefault('defaultParams', {}).update(payload['defaultParams'])
    if 'description' in payload:
        job['description'] = payload['description']
    return job

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def session(permissions=('CRON_JOB_READ', 'CRON_JOB_MANAGE'), locale='vi-VN', theme='light', width=1440, hold_auth=False):
        context = browser.new_context(viewport={'width': width, 'height': 1000})
        context.add_cookies([
            {'name': 'accessToken', 'value': 'mock-token', 'url': args.base_url},
            {'name': 'ppe_remember_me', 'value': 'true', 'url': args.base_url},
        ])
        context.add_init_script("""
            localStorage.setItem('ppe_remember_me','true');
            localStorage.setItem('ppe.locale',%s);
            localStorage.setItem('theme',%s);
            window.EventSource=class {close(){} addEventListener(){}};
            const timeout = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'timeout');
            Object.defineProperty(XMLHttpRequest.prototype, 'timeout', {
                get: timeout.get,
                set(value) { timeout.set.call(this, value === window.__testCronTimeout ? 200 : value); }
            });
        """ % (json.dumps(locale), json.dumps(theme)))
        state = dict(jobs=copy.deepcopy(JOBS), reads=0, writes=[], mode='ok', list_error=None, hold_auth=hold_auth, held_auth=None, held=None)
        user = dict(id='cron-fixture', email='fixture@example.test', fullName='Fixture Operator',
                    role='SAFETY_MANAGER', permissions=list(permissions), isActive=True, mustChangePassword=False)
        headers = {'access-control-allow-origin': args.base_url, 'access-control-allow-credentials': 'true'}
        def fulfill(route, data, status=200):
            route.fulfill(status=status, headers=headers, json={'success': status == 200, 'data': data})
        def api(route):
            request = route.request
            path = urlparse(request.url).path
            if request.method == 'OPTIONS':
                return route.fulfill(status=204, headers={**headers, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type,authorization'})
            if path.endswith('/auth/me'):
                if state['hold_auth']:
                    state['held_auth'] = route
                    return
                return fulfill(route, user)
            if path.endswith('/auth/refresh'):
                return fulfill(route, dict(accessToken='mock-access', refreshToken='mock-refresh'))
            if '/cron/jobs' in path:
                if request.method == 'GET':
                    state['reads'] += 1
                    if state['list_error']:
                        return route.fulfill(status=state['list_error'], headers=headers, json={'success':False, 'message':'Fixture list failure', 'code':'FIXTURE_ERROR'})
                    return fulfill(route, state['jobs'])
                state['writes'].append((request.method, path, request.post_data_json if request.post_data else None))
                if state['mode'] in ('hold', 'timeout'):
                    state['held'] = route
                    return
                if state['mode'] == 'network':
                    return route.abort('failed')
                if state['mode'] == '422':
                    return route.fulfill(status=422, headers=headers, json={
                        'success': False, 'message': 'Validation failed', 'code': 'VALIDATION_ERROR',
                        'errors': [{'field': 'defaultParams.retentionDays', 'message': 'Fixture retention error'}],
                    })
                if state['mode'] in ('400', '403', '500'):
                    return route.fulfill(status=int(state['mode']), headers=headers, json={'success':False, 'message':'Fixture mutation failure', 'code':'FIXTURE_ERROR'})
                if request.method == 'PATCH' and not path.endswith('/toggle'):
                    job = next(job for job in state['jobs'] if job['name'] == path.split('/')[-1])
                    return fulfill(route, apply_edit(job, request.post_data_json))
                name = path.split('/')[-2]
                if path.endswith('/toggle'):
                    job = next(job for job in state['jobs'] if job['name'] == name)
                    job['isEnabled'] = not job['isEnabled']
                    return fulfill(route, dict(jobName=name, isEnabled=job['isEnabled']))
                return fulfill(route, dict(jobName=name, success=True, durationMs=42, data=dict(deletedCount=7, scannedCount=9, retentionDays=30, recipientCount=2, period='WEEKLY', stats={'auditLogsCount':11})))
            if path.endswith('/maintenance/public'):
                return fulfill(route, dict(enabled=False, status='ONLINE'))
            if path.endswith('/system/public'):
                return fulfill(route, {})
            if path.endswith('/notifications/unread-count'):
                return fulfill(route, dict(count=0))
            if path.endswith('/stream-ticket'):
                return fulfill(route, dict(ticket='fixture'))
            return fulfill(route, [])
        context.route('**/api/v1/**', api)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(args.base_url + '/scheduled-tasks')
        if not hold_auth:
            page.wait_for_load_state('networkidle')
        return context, page, state, errors, fulfill, user

    def ready(page, count=5):
        expect(page.locator('tbody tr')).to_have_count(count)
        expect(page.get_by_role('button', name='Làm mới', exact=True)).to_be_enabled()
    def close(page):
        page.get_by_role('dialog').locator('footer').get_by_role('button', name='Đóng', exact=True).click()
        expect(page.get_by_role('dialog')).to_have_count(0)
    def refresh(page):
        page.get_by_role('button', name='Làm mới', exact=True).click()
        expect(page.get_by_role('button', name='Làm mới', exact=True)).to_be_enabled()

    def row_action(page, name, action='Chạy ngay', enabled=True, label='Thao tác'):
        trigger = page.get_by_role('button', name=f'{label}: {name}', exact=True)
        trigger.scroll_into_view_if_needed()
        trigger.click()
        expect(trigger).to_have_attribute('aria-expanded', 'true')
        item = page.get_by_role('menuitem', name=action, exact=True)
        if enabled:
            expect(item).to_be_enabled()
            item.click()
        else:
            expect(item).to_be_disabled()
            page.keyboard.press('Escape')

    def choose(page, dialog, label, option):
        dialog.get_by_role('combobox', name=label, exact=True).click()
        page.get_by_role('option', name=option, exact=True).click()

    try:
        context, page, state, errors, fulfill, _ = session()
        ready(page)
        menu_name = 'Thao tác: cleanup-audit-logs'
        row_action(page, 'cleanup-audit-logs', action='Chỉnh sửa')
        edit = page.get_by_role('dialog', name='Chỉnh sửa tác vụ', exact=True)
        retention = edit.get_by_role('spinbutton', name='Số ngày lưu trữ log')
        description = edit.get_by_role('textbox', name='Mô tả tác vụ')
        save = edit.get_by_role('button', name='Lưu thay đổi', exact=True)
        expect(retention).to_have_value('30')
        expect(description).to_have_value('Dọn audit logs cũ')
        expect(edit.get_by_text('02:00 hàng ngày (UTC+7)', exact=True)).to_be_visible()
        expect(save).to_be_disabled()
        page.keyboard.press('Escape')
        expect(edit).to_have_count(0)
        expect(page.get_by_role('button', name=menu_name, exact=True)).to_be_focused()
        row_action(page, 'cleanup-audit-logs', action='Chỉnh sửa')

        retention.fill('29')
        expect(retention).to_have_attribute('aria-invalid', 'true')
        expect(save).to_be_disabled()
        retention.fill('60')
        description.fill('  Lưu audit log trong 60 ngày  ')
        choose(page, edit, 'Tần suất thực hiện', 'Hàng tuần')
        choose(page, edit, 'Thứ trong tuần', 'Chủ nhật')
        choose(page, edit, 'Giờ', '23')
        choose(page, edit, 'Phút', '59')
        expect(edit.get_by_text('23:59 Chủ nhật hàng tuần (UTC+7)', exact=True)).to_be_visible()

        for mode, error in [('422', 'Fixture retention error'), ('403', 'Bạn không có quyền chỉnh sửa tác vụ này.')]:
            state['mode'] = mode
            save.click()
            expect(edit.get_by_text(error, exact=True)).to_be_visible()
            expect(retention).to_have_value('60')
            expect(description).to_have_value('  Lưu audit log trong 60 ngày  ')
            expect(save).to_be_enabled()

        state['mode'] = 'hold'
        save.evaluate('(button) => { button.click(); button.click(); }')
        expect(edit.get_by_role('button', name='Đang lưu thay đổi', exact=True)).to_be_disabled()
        page.keyboard.press('Escape')
        expect(edit).to_be_visible()
        assert len(state['writes']) == 3
        method, path, patch = state['writes'][-1]
        assert method == 'PATCH' and path.endswith('/cron/jobs/cleanup-audit-logs')
        assert patch == {
            'schedule': {'frequency': 'WEEKLY', 'dayOfWeek': 0, 'hour': 23, 'minute': 59},
            'description': 'Lưu audit log trong 60 ngày',
            'defaultParams': {'retentionDays': 60},
        }
        state['mode'] = 'ok'
        fulfill(state['held'], apply_edit(state['jobs'][0], patch))
        expect(edit).to_have_count(0)
        expect(page.get_by_text('Đã lưu thay đổi', exact=True)).to_be_visible()
        expect(page.get_by_text('23:59 Chủ nhật hàng tuần (UTC+7)', exact=True)).to_be_visible()
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(page.get_by_text('23:59 Chủ nhật hàng tuần (UTC+7)', exact=True)).to_be_visible()
        row_action(page, 'cleanup-audit-logs')
        run_dialog = page.get_by_role('dialog')
        expect(run_dialog.get_by_role('spinbutton')).to_have_value('60')
        run_dialog.get_by_role('spinbutton').fill('70')
        run_dialog.get_by_role('button', name='Xác nhận', exact=True).click()
        expect(run_dialog.get_by_text('Theo phản hồi hệ thống', exact=True)).to_be_visible()
        assert state['writes'][-1][2] == {'params': {'retentionDays': 70}}
        assert state['jobs'][0]['defaultParams']['retentionDays'] == 60
        close(page)

        page.get_by_role('tab', name='Thẻ', exact=True).click()
        page.get_by_role('button', name='Chỉnh sửa: Báo cáo hoạt động hằng tuần', exact=True).click()
        expect(edit.get_by_role('spinbutton')).to_have_count(0)
        choose(page, edit, 'Tần suất thực hiện', 'Hàng tháng')
        choose(page, edit, 'Ngày trong tháng', '28')
        expect(edit.get_by_text('08:00 ngày 28 hàng tháng (UTC+7)', exact=True)).to_be_visible()
        save.click()
        expect(edit).to_have_count(0)
        assert state['jobs'][4]['isEnabled'] is False
        assert state['writes'][-1][2] == {'schedule': {
            'frequency': 'MONTHLY', 'dayOfMonth': 28, 'hour': 8, 'minute': 0,
        }}
        expect(page.get_by_text('08:00 ngày 28 hàng tháng (UTC+7)', exact=True)).to_be_visible()

        # Resolve an uncertain result from a fresh read without submitting again.
        page.get_by_role('button', name='Chỉnh sửa: Dọn audit log cũ', exact=True).click()
        choose(page, edit, 'Tần suất thực hiện', 'Hàng giờ')
        choose(page, edit, 'Khoảng lặp', '6 giờ')
        expect(edit.get_by_text('Mỗi 6 giờ (phút :59) (UTC+7)', exact=True)).to_be_visible()
        state['mode'] = 'timeout'
        page.evaluate('window.__testCronTimeout = 15000')
        writes = len(state['writes'])
        save.click()
        expect(edit.get_by_role('alert')).to_contain_text('Chưa xác định được thay đổi đã lưu hay chưa.')
        assert len(state['writes']) == writes + 1
        assert state['writes'][-1][2] == {'schedule': {'frequency': 'HOURLY', 'everyHours': 6, 'minute': 59}}
        state['held'].abort()
        expect(save).to_have_count(0)
        state['mode'] = 'ok'
        page.evaluate('window.__testCronTimeout = null')
        state['list_error'] = 403
        edit.get_by_role('button', name='Làm mới', exact=True).click()
        expect(edit.get_by_role('alert')).to_contain_text('Không thể lấy cấu hình mới nhất.')
        expect(save).to_have_count(0)
        state['list_error'] = None
        edit.get_by_role('button', name='Làm mới', exact=True).click()
        expect(edit).to_have_count(0)
        expect(page.get_by_role('button', name='Chỉnh sửa: Dọn audit log cũ', exact=True)).to_be_enabled()
        assert len(state['writes']) == writes + 1
        assert not errors, errors
        context.close()
        print('PASS: edit from table and card, preview, PATCH, saved defaults, disabled job, permissions and validation errors, timeout recovery')

        context, page, state, errors, fulfill, user = session(hold_auth=True)
        page.wait_for_function('document.body.innerText.length > 0')
        assert state['reads'] == 0, 'No cron query before auth restoration'
        for _ in range(50):
            if state['held_auth'] is not None:
                break
            page.wait_for_timeout(100)
        assert state['held_auth'] is not None
        state['hold_auth'] = False
        fulfill(state['held_auth'], user)
        ready(page)
        expect(page.get_by_test_id('cron-kpi-total')).to_have_text('5')
        expect(page.get_by_test_id('cron-kpi-enabled')).to_have_text('4')
        expect(page.get_by_test_id('cron-kpi-disabled')).to_have_text('1')
        expect(page.locator('aside a[href="/scheduled-tasks"]')).to_have_attribute('aria-current', 'page')
        expect(page.get_by_text('02:00 hàng ngày (UTC+7)', exact=True)).to_be_visible()
        expect(page.get_by_text('08:00 Thứ Hai hàng tuần (UTC+7)', exact=True)).to_be_visible()
        expect(page.get_by_text('READY', exact=True)).to_have_count(0)
        page.screenshot(path=str(artifacts / 'desktop.png'), full_page=True)
        search = page.get_by_role('searchbox')
        search.fill('AUDIT')
        expect(page.locator('tbody tr')).to_have_count(1)
        expect(page.get_by_test_id('cron-kpi-total')).to_have_text('5')
        search.fill('no-such-job')
        expect(page.get_by_text('Không có tác vụ phù hợp. Hãy đổi từ khóa hoặc bộ lọc.')).to_be_visible()
        search.fill('')
        page.get_by_role('combobox', name='Lọc trạng thái lịch').click()
        page.get_by_role('option', name='Đang tắt', exact=True).click()
        expect(page.locator('tbody tr')).to_have_count(1)
        expect(page.get_by_test_id('cron-kpi-enabled')).to_have_text('4')
        # A disabled schedule can still be triggered; pending dialog cannot close.
        state['mode'] = 'hold'
        row_action(page, 'weekly-summary-digest')
        dialog = page.get_by_role('dialog')
        expect(dialog.get_by_text('Lịch tự động đang tắt.', exact=False)).to_be_visible()
        confirm = dialog.get_by_role('button', name='Xác nhận', exact=True)
        confirm.evaluate('(button) => { button.click(); button.click(); }')
        expect(dialog.get_by_role('button', name='Đang xử lý…')).to_be_disabled()
        page.keyboard.press('Escape')
        expect(dialog).to_be_visible()
        assert len(state['writes']) == 1 and state['writes'][-1][2] == {'params': {}}
        fulfill(state['held'], dict(jobName='weekly-summary-digest', success=True, durationMs=42, data=dict(period='WEEKLY', recipientCount=2, stats={'auditLogsCount':11})))
        expect(dialog.get_by_text('Theo phản hồi hệ thống', exact=True)).to_be_visible()
        expect(dialog.get_by_text('42 ms', exact=True)).to_be_visible()
        dialog.get_by_text('Xem dữ liệu JSON chi tiết', exact=True).click()
        expect(dialog.locator('pre')).to_contain_text('auditLogsCount')
        expect(dialog.locator('pre')).to_contain_text('"data"')
        close(page)
        state['mode'] = 'ok'
        page.get_by_role('combobox', name='Lọc trạng thái lịch').click()
        page.get_by_role('option', name='Tất cả lịch', exact=True).click()
        ready(page)
        # Validate dangerous cleanup inputs without making a request.
        for name, default, invalids, valid, key in [
            ('cleanup-audit-logs', '30', ['', '29', '3651', '30.5'], '3650', 'retentionDays'),
            ('cleanup-unconfirmed-uploads', '24', ['', '0', '721', '1.5'], '1', 'maxAgeHours'),
        ]:
            row_action(page, name)
            dialog = page.get_by_role('dialog')
            field = dialog.get_by_role('spinbutton')
            expect(field).to_have_value(default)
            previous = len(state['writes'])
            for value in invalids:
                field.fill(value)
                dialog.get_by_role('button', name='Xác nhận', exact=True).click()
                expect(field).to_have_attribute('aria-invalid', 'true')
                assert len(state['writes']) == previous
            field.fill(valid)
            dialog.get_by_role('button', name='Xác nhận', exact=True).click()
            expect(dialog.get_by_text('Theo phản hồi hệ thống', exact=True)).to_be_visible()
            assert state['writes'][-1][2] == {'params': {key: int(valid)}}
            close(page)
            ready(page)
        # Toggle is applied from the response, not optimistically.
        state['mode'] = 'hold'
        state['held'] = None
        page.get_by_role('switch', name='Tắt lịch: cleanup-audit-logs', exact=True).click()
        dialog = page.get_by_role('alertdialog')
        with page.expect_request(lambda request: request.method == 'PATCH' and request.url.endswith('/toggle')) as sent:
            dialog.get_by_role('button', name='Tắt lịch', exact=True).click()
        expect(page.get_by_test_id('cron-kpi-enabled')).to_have_text('4')
        assert sent.value.post_data is None
        for _ in range(50):
            if state['held'] is not None:
                break
            page.wait_for_timeout(100)
        assert state['held'] is not None
        state['jobs'][0]['isEnabled'] = False
        fulfill(state['held'], dict(jobName='cleanup-audit-logs', isEnabled=False))
        expect(dialog).to_have_count(0)
        expect(page.get_by_test_id('cron-kpi-enabled')).to_have_text('3')
        ready(page)
        # 4xx remains actionable; neither mutation is automatically retried.
        for code, name in [('400', 'cleanup-expired-tokens'), ('403', 'daily-summary-digest')]:
            state['mode'] = code
            row_action(page, name)
            dialog = page.get_by_role('dialog')
            before = len(state['writes'])
            dialog.get_by_role('button', name='Xác nhận', exact=True).click()
            expect(dialog.get_by_role('alert')).to_have_text('Fixture mutation failure')
            expect(dialog.get_by_role('button', name='Xác nhận', exact=True)).to_be_enabled()
            assert len(state['writes']) == before + 1
            dialog.get_by_role('button', name='Hủy', exact=True).click()
        # A transport or server failure blocks retries until an explicit refresh.
        for mode in ['network', '500', 'timeout']:
            state['mode'] = mode
            page.evaluate('window.__testCronTimeout = ' + ('60000' if mode == 'timeout' else 'null'))
            row_action(page, 'cleanup-expired-tokens')
            dialog = page.get_by_role('dialog')
            before = len(state['writes'])
            dialog.get_by_role('button', name='Xác nhận', exact=True).click()
            expect(dialog.get_by_role('alert')).to_contain_text('Chưa xác định được kết quả')
            expect(dialog.get_by_role('button', name='Xác nhận', exact=True)).to_be_disabled()
            if mode == 'timeout': state['held'].abort()
            assert len(state['writes']) == before + 1
            dialog.get_by_role('button', name='Hủy', exact=True).click()
            row_action(page, 'cleanup-expired-tokens', enabled=False)
            state['mode'] = 'ok'
            refresh(page)
            ready(page)
        # Toggle uncertainty cannot silently flip the switch a second time.
        state['mode'] = 'network'
        page.get_by_role('switch', name='Bật lịch: cleanup-audit-logs', exact=True).click()
        dialog = page.get_by_role('alertdialog')
        before = len(state['writes'])
        dialog.get_by_role('button', name='Bật lịch', exact=True).click()
        expect(page.get_by_text('Chưa xác định được kết quả yêu cầu.', exact=False).first).to_be_visible()
        dialog.get_by_role('button', name='Bật lịch', exact=True).click()
        assert len(state['writes']) == before + 1
        dialog.get_by_role('button', name='Hủy', exact=True).click()
        state['mode'] = 'ok'
        refresh(page)
        # Data-load errors are distinct from empty results and recover on refresh.
        state['list_error'] = 403
        refresh(page)
        expect(page.locator('[data-table-root]').get_by_role('alert')).to_be_visible()
        state['list_error'] = None
        refresh(page)
        state['jobs'] = []
        refresh(page)
        expect(page.get_by_text('Chưa có tác vụ định kỳ nào.', exact=True)).to_be_visible()
        expect(page.get_by_test_id('cron-kpi-total')).to_have_text('0')
        state['jobs'] = copy.deepcopy(JOBS)
        refresh(page)
        # Keyboard focus remains inside the modal, then Escape restores focus.
        row_action(page, 'cleanup-expired-tokens')
        page.keyboard.press('Tab')
        assert page.evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)')
        page.keyboard.press('Escape')
        expect(page.get_by_role('dialog')).to_have_count(0)
        # Page/tab re-entry refetches without enabling polling.
        previous = state['reads']
        with page.expect_request(lambda request: request.method == 'GET' and urlparse(request.url).path.endswith('/cron/jobs')):
            page.evaluate("window.dispatchEvent(new Event('visibilitychange'))")
        expect(page.get_by_role('button', name='Làm mới', exact=True)).to_be_enabled()
        page.reload(); page.wait_for_load_state('networkidle'); ready(page)
        assert state['reads'] > previous
        page.get_by_role('button', name='Thu gọn menu', exact=True).press('Enter')
        expect(page.locator('aside a[href="/scheduled-tasks"]')).to_have_attribute('title', 'Tác vụ định kỳ')
        assert not errors, errors
        context.close()
        print('PASS: list, filters, validation, manual output, toggle, permissions-independent data, 4xx/5xx/network/timeout, refresh, keyboard, reload, collapsed sidebar')

        for permissions in [('CRON_JOB_READ',), (), ('CRON_JOB_MANAGE',)]:
            context, page, state, errors, _, _ = session(permissions=permissions)
            if permissions == ('CRON_JOB_READ',):
                ready(page)
                page.get_by_role('button', name='Thao tác: cleanup-audit-logs', exact=True).click()
                expect(page.get_by_role('menuitem', name='Chỉnh sửa', exact=True)).to_have_count(0)
                expect(page.get_by_role('menuitem', name='Chạy ngay', exact=True)).to_have_count(0)
                page.keyboard.press('Escape')
                page.get_by_role('tab', name='Thẻ', exact=True).click()
                expect(page.get_by_role('button', name='Chỉnh sửa:', exact=False)).to_have_count(0)
                assert not state['writes']
                assert state['reads'] > 0
            else:
                expect(page.get_by_text('Không có quyền truy cập', exact=True)).to_be_visible()
                expect(page.locator('aside a[href="/scheduled-tasks"]')).to_have_count(0)
                assert state['reads'] == 0
            assert not errors, errors
            context.close()
        print('PASS: read-only controls and permission checks for non-admin roles')

        context, page, state, errors, _, _ = session(locale='en-US', theme='dark', width=390)
        expect(page.get_by_role('heading', name='Scheduled Tasks & Cron Jobs', exact=True)).to_be_visible()
        expect(page.locator('tbody tr')).to_have_count(5)
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Page must not overflow horizontally'
        page.screenshot(path=str(artifacts / 'mobile-dark.png'), full_page=True)
        page.get_by_role('tab', name='Card', exact=True).click()
        page.get_by_role('button', name='Edit: Clean up old audit logs', exact=True).click()
        edit = page.get_by_role('dialog', name='Edit scheduled task', exact=True)
        expect(edit.get_by_role('spinbutton')).to_have_value('30')
        frequency = edit.get_by_role('combobox', name='Frequency', exact=True)
        frequency.focus()
        page.keyboard.press('Enter')
        expect(frequency).to_have_attribute('aria-expanded', 'true')
        page.keyboard.press('Escape')
        expect(edit).to_be_visible()
        expect(frequency).to_have_attribute('aria-expanded', 'false')
        page.keyboard.press('Tab')
        assert page.evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)')
        assert edit.evaluate('(dialog) => dialog.scrollWidth <= dialog.clientWidth')
        page.screenshot(path=str(artifacts / 'mobile-dialog.png'), full_page=True)
        page.keyboard.press('Escape')
        menu = page.get_by_role('button', name='Open navigation menu', exact=True)
        menu.click()
        expect(page.locator('nav[aria-label="Mobile main navigation"] a[href="/scheduled-tasks"]')).to_be_visible()
        assert not errors, errors
        context.close()
        print('PASS: English, dark theme, 390px layout, mobile modal and navigation')
        print('Artifacts:', artifacts)
    finally:
        browser.close()
