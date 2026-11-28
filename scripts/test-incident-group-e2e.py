"""Exercise production Manager → Officer incident pages with synthetic APIs only.
Run: python3 scripts/test-incident-group-e2e.py [--artifacts /tmp/ppe-incident-group-e2e]
"""
import argparse
from copy import deepcopy
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import subprocess
import tempfile
import threading
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--artifacts', default='/tmp/ppe-incident-group-e2e')
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[1]
def uuid(n): return f'00000000-0000-4000-8000-{n:012x}'
MANAGER, OFFICER, SITE, CAMERA = uuid(200), uuid(201), uuid(400), uuid(300)
def incident(n):
    return dict(id=uuid(n), siteId=SITE, siteName='Công trường A', cameraId=CAMERA, cameraCode='CAM-01', cameraName='Cổng chính', status='PENDING_REVIEW', severity='HIGH', violationType='NO_HELMET', detectedAt=f'2026-11-18T00:{n:02d}:00Z', createdAt='2026-11-18T00:00:00Z', updatedAt='2026-11-18T00:00:00Z', assignments=[], evidences=[], statusHistory=[])

with tempfile.TemporaryDirectory(prefix='ppe-incident-group-') as temp:
    out = Path(temp)
    (out / 'empty.js').write_text('')
    build = dict(entryPoints=[str(ROOT / 'scripts/incident-group-fixture.tsx')], bundle=True, outfile=str(out / 'app.js'),
        banner={'js': "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"}, logOverride={'assign-to-define': 'silent'},
        platform='browser', jsx='automatic', tsconfig=str(ROOT / 'tsconfig.json'), alias={'client-only': str(out / 'empty.js')},
        define={'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_API_BASE_URL': '"/api/v1"', 'process.env.NEXT_PUBLIC_APP_URL': '"http://localhost"', 'process.env.NEXT_PUBLIC_IDENTITY_URL': '"/api/v1"', 'process.argv': '[]'})
    subprocess.run(['node', '-e', 'require("esbuild").buildSync(' + json.dumps(build) + ')'], cwd=ROOT, check=True)
    subprocess.run(['node', '-e', """(async () => {
      const fs=require('node:fs'), {compile}=require('@tailwindcss/node'), {Scanner}=require('@tailwindcss/oxide');
      const root=process.cwd(); const c=await compile(fs.readFileSync(root+'/app/globals.css','utf8'),{base:root+'/app',onDependency:()=>{}});
      fs.writeFileSync(process.argv[1],c.build(new Scanner({sources:c.sources}).scan()));
    })().catch(e=>{console.error(e);process.exit(1)});""", str(out / 'style.css')], cwd=ROOT, check=True)
    (out / 'index.html').write_text('<html lang="vi" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body style="margin:0;background:#f5f2eb"><div id="root"></div><script src="/app.js"></script></body></html>')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
        def do_GET(self):
            if not Path(self.translate_path(self.path)).is_file(): self.path = '/index.html'
            super().do_GET()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=temp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    records = {uuid(n): incident(n) for n in range(1, 9)}
    notifications, writes, errors, unexpected = [], [], [], []
    state = dict(upload_fail=False, resolve_fail=False, summary_fail=False, missing=None, review_fail=None, assignment_fail=None)
    def api(route):
        request = route.request
        url = urlparse(request.url)
        path, q = url.path.removeprefix('/api/v1'), parse_qs(url.query)
        actor = request.headers.get('x-fixture-user', MANAGER)
        method = request.method
        if method != 'GET': writes.append((path, (request.post_data_buffer or b'').decode('utf-8', errors='replace')))
        def ok(data, meta=None):
            body = dict(success=True, data=deepcopy(data))
            if meta is not None: body['meta'] = meta
            route.fulfill(json=body)
        def fail(code=503): route.fulfill(status=code, json=dict(success=False, message='Synthetic failure', code='FIXTURE_ERROR'))
        def paginated(values):
            page, limit = int(q.get('page', ['1'])[0]), int(q.get('limit', ['100'])[0])
            return ok(values[(page-1)*limit:page*limit], dict(page=page, limit=limit, total=len(values), totalPages=(len(values)+limit-1)//limit))
        if path == '/system/public': return ok({})
        if path == '/users': return paginated([dict(id=OFFICER, fullName='Trần Cán Bộ', email='officer@example.test', isActive=True, role=dict(name='SAFETY_OFFICER'), siteIds=[SITE])])
        if path == '/sites': return paginated([dict(id=SITE, code='SITE-A', name='Công trường A', status='ACTIVE', contactOfficers=[dict(userId=OFFICER)], createdAt='2026-11-18T00:00:00Z')])
        if path == '/cameras': return paginated([dict(id=CAMERA, siteId=SITE, name='Cổng chính', code='CAM-01', status='ONLINE', sourceType='RTSP', rtspUrl='rtsp://example.test')])
        if path == '/notifications/unread-count': return ok(dict(unreadCount=sum(n['userId'] == actor for n in notifications)))
        if path == '/notifications/trigger-incident':
            payload = request.post_data_json
            if payload['description'].startswith('[BÁO CÁO ĐÃ KHẮC PHỤC]') and state['summary_fail']: return fail()
            sent = []
            for recipient in payload['recipientUserIds']:
                item = dict(id=uuid(10000+len(notifications)), userId=recipient, incidentId=payload['incidentId'], channel='IN_APP', status='SENT', severity=payload['severity'], title='Thông báo sự cố PPE', content=payload['description'], createdAt='2026-11-18T04:00:00Z', isRead=False)
                notifications.insert(0, item)
                sent.append(dict(id=item['id'], userId=recipient, channel='IN_APP', status='SENT'))
            return ok(dict(incidentId=payload['incidentId'], dispatchedCount=len(sent), channels=['IN_APP'], notifications=sent))
        if path == '/notifications':
            values = [n for n in notifications if n['userId'] == actor and (not q.get('search') or q['search'][0] in n['content'])]
            return paginated(values)
        if path.startswith('/notifications/') and path.endswith('/read'): return ok(dict(message='Read'))
        if path == '/incidents/status-counts':
            statuses = [record['status'] for record in records.values()]
            return ok(dict(total=len(statuses), pendingReview=statuses.count('PENDING_REVIEW'),
                           resolved=statuses.count('RESOLVED') + statuses.count('CLOSED'),
                           confirmed=statuses.count('CONFIRMED'), closed=statuses.count('CLOSED'),
                           dismissed=statuses.count('DISMISSED'), critical=0))
        if path == '/incidents/batch-review':
            ids = [id for id in request.post_data_json['ids'] if id != state['review_fail']]
            for id in ids: records[id]['status'] = 'CONFIRMED'
            return ok(dict(updatedIds=ids, updatedCount=len(ids), total=len(request.post_data_json['ids']), action='CONFIRM', newStatus='CONFIRMED'))
        if path == '/incidents':
            values = list(records.values())
            if q.get('status'): values = [r for r in values if r['status'] == q['status'][0]]
            return paginated(values)
        if path == '/evidences/direct-upload':
            match = re.search(b'name="incidentId"\r\n\r\n([^\r]+)', request.post_data_buffer)
            id = match.group(1).decode()
            if state['upload_fail'] and id == uuid(3): return fail()
            return ok(dict(id=uuid(900), incidentId=id, evidenceType='SNAPSHOT', fileName='shared.png', createdAt='2026-11-18T04:00:00Z'))
        match = re.fullmatch('/incidents/([^/]+)(?:/(comments|assignments|resolve))?', path)
        if match:
            id, action = match.groups()
            if id == state['missing']: return fail(404)
            if id not in records: return fail(404)
            record = records[id]
            if action == 'comments': return ok([])
            if action == 'assignments':
                if id == state['assignment_fail']: return fail()
                record['assignments'] = [dict(id=uuid(500+int(id[-4:], 16)), incidentId=id, assignedTo=request.post_data_json['assignedTo'], status='ACTIVE', assignedAt='2026-11-18T01:00:00Z')]
                return ok(record['assignments'][0])
            if action == 'resolve':
                if state['resolve_fail']: return fail()
                assert actor == OFFICER and record['status'] == 'CONFIRMED', (actor, record)
                record['status'], record['resolvedAt'] = 'RESOLVED', '2026-11-18T04:00:00Z'
                for assignment in record['assignments']: assignment['status'] = 'COMPLETED'
                return ok(record)
            return ok(record)
        unexpected.append((method, path))
        fail(500)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport=dict(width=1440, height=1000))
            page.route('**/api/v1/**', api)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base + '/incidents')
            # Use the actual Manager batch-dispatch action and modal.
            page.get_by_title('Bấm để chọn/bỏ chọn 8 sự cố của CAM-01').click()
            page.get_by_role('button', name='Duyệt & Giao Officer (8)', exact=True).click()
            dialog = page.get_by_role('dialog')
            expect(dialog.locator('select')).to_have_value(OFFICER)
            dialog.get_by_role('button', name='Giao 8 sự cố & Gửi tín hiệu').click()
            result = page.get_by_role('region', name='Kết quả giao nhóm sự cố')
            expect(result).to_contain_text('8 thành công · 0 chưa thành công')
            assert len(notifications) == 1
            dispatch = notifications[0]
            # Officer opens the exact group from Notifications, survives reload.
            page.get_by_label('Test account').select_option('officer')
            page.get_by_role('button', name='Inbox', exact=True).click()
            expect(page.get_by_test_id('inbox')).to_be_visible()
            page.get_by_role('link', name='Mở nhóm xử lý').click()
            group = page.get_by_role('region', name='Nhóm sự cố được giao')
            expect(group).to_contain_text('Nhóm được giao · 8 sự cố')
            expect(group).to_contain_text('Đã khắc phục 0/8 · Còn 8')
            group_url = page.url
            page.reload()
            expect(group).to_contain_text('Đã khắc phục 0/8 · Còn 8')
            # Bell, realtime popup and compare preserve the same immutable group.
            page.get_by_role('button', name='Incidents', exact=True).click()
            page.locator('#notification-bell-btn').click()
            page.get_by_text('Mở nhóm xử lý', exact=True).click()
            expect(group).to_contain_text('Đang xem sự cố 1/8')
            page.get_by_role('button', name='Incidents', exact=True).click()
            page.get_by_role('button', name='Dispatch SSE', exact=True).click()
            page.get_by_role('button', name='Đối chiếu', exact=True).click()
            expect(group).to_contain_text('Nhóm được giao · 8 sự cố')
            assert 'focus=compare' in page.url
            page.get_by_role('button', name='Clear notifications').click()
            # Dirty draft refuses navigation, then persists through a failed save.
            page.get_by_role('button', name=re.compile('^Giải quyết')).first.click()
            expect(dialog).to_be_visible()
            dialog.locator('textarea').fill('Đã bổ sung mũ bảo hộ tại cổng.')
            page.once('dialog', lambda d: d.dismiss())
            page.keyboard.press('Escape')
            expect(dialog.locator('textarea')).to_have_value('Đã bổ sung mũ bảo hộ tại cổng.')
            state['resolve_fail'] = True
            dialog.get_by_role('button', name='Báo cáo & tiếp theo', exact=True).click()
            expect(dialog).to_contain_text('Synthetic failure')
            assert f'/incidents/{uuid(1)}?' in page.url
            expect(dialog.locator('textarea')).to_have_value('Đã bổ sung mũ bảo hộ tại cổng.')
            state['resolve_fail'] = False
            dialog.get_by_role('button', name='Báo cáo & tiếp theo', exact=True).click()
            expect(group).to_contain_text('Đang xem sự cố 2/8')
            expect(group).to_contain_text('Đã khắc phục 1/8 · Còn 7')
            assert len(notifications) == 1, 'no per-item remediation notification'
            # Save-only stays on incident 2; next/previous may inspect completed members.
            page.get_by_role('button', name=re.compile('^Giải quyết')).first.click()
            expect(dialog.locator('textarea')).to_have_value('')
            dialog.locator('textarea').fill('Đã kiểm tra và khắc phục hồ sơ thứ hai.')
            dialog.get_by_role('button', name='Lưu báo cáo', exact=True).click()
            expect(group).to_contain_text('Đã khắc phục 2/8 · Còn 6')
            expect(group).to_contain_text('Đang xem sự cố 2/8')
            page.go_back()
            expect(group).to_have_count(0)
            assert urlparse(page.url).path == '/incidents'
            page.go_forward()
            expect(group).to_contain_text('Đang xem sự cố 2/8')
            # Shared report: one upload fails, five succeed; retry resolves only the remaining member.
            group.get_by_role('button', name='Danh sách nhóm', exact=True).click()
            for n in range(3, 9): group.get_by_role('checkbox', name=f'Chọn sự cố {n}', exact=True).check()
            group.get_by_role('button', name='Báo cáo chung (6)', exact=True).click()
            dialog.locator('textarea').fill('Đã trang bị mũ cho cùng tổ thi công.')
            dialog.locator('input[type=file]').set_input_files(dict(name='remediation.png', mimeType='image/png', buffer=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')))
            state['upload_fail'] = True
            dialog.locator('button[form="batch-resolve-form"]').click()
            expect(dialog).to_contain_text('1 hồ sơ chưa thành công')
            expect(group).to_contain_text('Đã khắc phục 7/8 · Còn 1')
            assert records[uuid(3)]['status'] == 'CONFIRMED'
            assert len(notifications) == 1
            page.screenshot(path=str(artifacts / 'partial-report-desktop.png'), full_page=True)
            state['upload_fail'], state['summary_fail'] = False, True
            dialog.locator('button[form="batch-resolve-form"]').click()
            expect(dialog).not_to_be_visible()
            expect(group).to_contain_text('Đã khắc phục 8/8 sự cố — chờ quản lý nghiệm thu.')
            expect(group).to_contain_text('Đã khắc phục hết nhóm, chưa gửi được tổng kết.')
            resolves_before = len([w for w in writes if w[0].endswith('/resolve')])
            state['summary_fail'] = False
            group.get_by_role('button', name='Gửi lại tổng kết', exact=True).click()
            expect(group).to_contain_text('Đã tạo thông báo tổng kết cho người giao.')
            assert len([w for w in writes if w[0].endswith('/resolve')]) == resolves_before
            summaries = [n for n in notifications if n['content'].startswith('[BÁO CÁO ĐÃ KHẮC PHỤC]')]
            assert len(summaries) == 2 and {n['userId'] for n in summaries} == {MANAGER, OFFICER}
            page.reload()
            expect(group).to_contain_text('Đã khắc phục 8/8 sự cố')
            assert len([n for n in notifications if n['content'].startswith('[BÁO CÁO ĐÃ KHẮC PHỤC]')]) == 2
            # New-device receipt lookup does not send another summary.
            page.evaluate("sessionStorage.clear(); sessionStorage.setItem('fixture-role','officer')")
            page.reload()
            expect(group).to_contain_text('Đã tìm thấy tổng kết của nhóm trước đó')
            assert len(notifications) == 3
            page.get_by_role('button', name='Clear notifications').click()
            page.screenshot(path=str(artifacts / 'completed-desktop.png'), full_page=True)
            page.set_viewport_size(dict(width=390, height=844))
            group.get_by_role('button', name='Danh sách nhóm', exact=True).click()
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'mobile page overflow'
            page.screenshot(path=str(artifacts / 'completed-mobile.png'), full_page=True)
            # Other account cannot act; revoked read permission hides cached data immediately.
            page.get_by_label('Test account').select_option('other')
            expect(group.get_by_role('button', name=re.compile('Báo cáo chung'))).to_have_count(0)
            page.get_by_role('button', name='Toggle read permission').click()
            expect(group).to_contain_text('Bạn chưa có quyền đọc sự cố')
            expect(group).not_to_contain_text('Đã khắc phục 8/8')
            page.get_by_role('button', name='Toggle read permission').click()
            # Manager receives the summary link for acceptance; no automatic close was invoked.
            page.get_by_label('Test account').select_option('manager')
            page.get_by_role('button', name='Inbox', exact=True).click()
            page.get_by_role('link', name='Mở nhóm xử lý').click()
            expect(group).to_contain_text('Đã khắc phục 8/8 sự cố')
            assert not any(path.endswith('/close') for path, _ in writes)
            # Legacy and malformed contexts fall back safely, without invented progress.
            page.goto(base + f'/incidents/{uuid(1)}?dispatch=legacy')
            expect(page.get_by_text('Thông báo cũ không lưu danh sách sự cố trong nhóm.', exact=False)).to_be_visible()
            expect(group).to_have_count(0)
            page.goto(base + f'/incidents/{uuid(1)}?group=broken&context=broken')
            expect(page.get_by_text('Ngữ cảnh nhóm không hợp lệ.', exact=False)).to_be_visible()
            expect(group).to_have_count(0)
            # Current record 404 still leaves group navigation usable and completion unverified.
            state['missing'] = uuid(1)
            page.goto(group_url)
            expect(group).to_contain_text('1 hồ sơ chưa xác minh')
            expect(group).not_to_contain_text('Đã khắc phục 8/8 sự cố')
            group.get_by_role('button', name='Tiếp', exact=True).click()
            expect(group).to_contain_text('Đang xem sự cố 2/8')
            assert not unexpected, unexpected
            assert not errors, errors
            browser.close()
            print('PASS: manager dispatch, all notification entry points, reload/device, save/next, partial upload/retry, summary failure/retry/dedup, permissions, legacy, 404 and mobile.')
            (artifacts / 'result.json').write_text(json.dumps(dict(passed=True, writes=len(writes), notifications=len(notifications), errors=errors), indent=2))
    except Exception:
        if "page" in locals() and not page.is_closed():
            try:
                page.screenshot(path=str(artifacts / "failure.png"), full_page=True)
                (artifacts / "failure.html").write_text(page.content())
            except Exception: pass
        (artifacts / "failure.json").write_text(json.dumps(dict(errors=errors, unexpected=unexpected, writes=writes, notifications=notifications), ensure_ascii=False, indent=2))
        raise
    finally:
        server.shutdown()
