"""Browser regression of the actual SiteAnalyticsTab with synthetic API responses.
Run: python3 scripts/test-site-analytics-e2e.py
No real backend is contacted. Reports and downloads are synthetic.
"""
import argparse
from datetime import datetime, timedelta, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import tempfile
import threading
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--artifacts', default='/tmp/ppe-site-analytics-e2e')
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[1]
VN = timezone(timedelta(hours=7))
today = datetime.now(VN).date()
start = datetime.combine(today, datetime.min.time(), tzinfo=VN)
with tempfile.TemporaryDirectory(prefix='ppe-analytics-') as temp:
    out = Path(temp)
    (out / 'empty.js').write_text('')
    build = {
        'entryPoints': [str(ROOT / 'scripts/site-analytics-fixture.tsx')], 'bundle': True, 'outfile': str(out / 'app.js'),
        'banner': {'js': "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"},
        'logOverride': {'assign-to-define': 'silent'}, 'platform': 'browser', 'jsx': 'automatic', 'tsconfig': str(ROOT / 'tsconfig.json'),
        'alias': {'client-only': str(out / 'empty.js')},
        'define': {'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_API_BASE_URL': '"/api/v1"', 'process.env.NEXT_PUBLIC_APP_URL': '"http://localhost"', 'process.env.NEXT_PUBLIC_IDENTITY_URL': '"/api/v1"', 'process.argv': '[]'},
    }
    subprocess.run(['node', '-e', "require('esbuild').buildSync(" + json.dumps(build) + ')'], cwd=ROOT, check=True)
    # Compile the real Tailwind styles directly, so layout checks do not depend on a prior Next build.
    css_build = """(async () => {
      const fs = require('node:fs');
      const {compile} = require('@tailwindcss/node');
      const {Scanner} = require('@tailwindcss/oxide');
      const root = process.cwd();
      const compiler = await compile(fs.readFileSync(root + '/app/globals.css', 'utf8'), {
        base: root + '/app', onDependency: () => {}
      });
      const scanner = new Scanner({sources: compiler.sources});
      fs.writeFileSync(process.argv[1], compiler.build(scanner.scan()));
    })().catch(error => { console.error(error); process.exit(1); });"""
    subprocess.run(['node', '-e', css_build, str(out / 'style.css')], cwd=ROOT, check=True)
    (out / 'index.html').write_text('<html lang="vi" data-theme="light"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;background:#f5f2eb"><div id="root"></div><script src="/app.js"></script></body></html>')

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=temp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    requests, writes, errors = [], [], []
    held = []
    state = {'history_error': False, 'download_error': False, 'generation_status': 'COMPLETED'}

    def incident(i, mode):
        status = ['PENDING_REVIEW', 'CONFIRMED', 'RESOLVED', 'DISMISSED', 'CLOSED'][i % 5]
        if mode in ('closed-limit', 'closed-history', 'detail-error'): status = 'CLOSED'
        detected = start + timedelta(minutes=i)
        return dict(id=f'{mode}-{i}', siteId=mode, cameraId=f'camera-{i%3}', violationType=['NO_HELMET', 'MULTI_VIOLATION', 'LEGACY'][i%3], severity=['HIGH', 'LOW', 'MEDIUM'][i%3], status=status, detectedAt=detected.isoformat(), resolvedAt=(detected + timedelta(minutes=30)).isoformat() if status == 'RESOLVED' or (status == 'CLOSED' and i % 10 == 4) else None, createdAt=detected.isoformat(), updatedAt=detected.isoformat())

    def report(i, mode):
        return dict(id=f'{mode}-report-{i}', templateId='pdf-template', siteId=mode, reportType='VIOLATION_SUMMARY', generatedBy='author' if i % 2 == 0 else 'someone-else', status='COMPLETED', fileName=f'{mode}-report-{i}.pdf', periodStart=str(today), periodEnd=str(today), generatedAt=start.isoformat(), createdAt=start.isoformat(), template=dict(id='pdf-template', name='PDF fixture', fileType='PDF', code='VIOLATION_SUMMARY', version='1.0.0', status='ACTIVE'))

    def api(route):
        request = route.request
        url = urlparse(request.url)
        path = url.path.removeprefix('/api/v1')
        q = parse_qs(url.query)
        requests.append((path, q, request.method))
        def ok(data, meta=None):
            body = {'success': True, 'data': data}
            if meta is not None: body['meta'] = meta
            route.fulfill(json=body)
        def fail(code=503): route.fulfill(status=code, json={'success': False, 'message': 'Synthetic failure', 'code': 'FIXTURE_ERROR'})
        if path == '/system/public': return ok({})
        if path == '/reports/templates': return ok([dict(id='pdf-template', name='PDF fixture', fileType='PDF', code='VIOLATION_SUMMARY', version='1.0.0', status='ACTIVE')])
        if path == '/reports/generate':
            writes.append(request.post_data_json)
            r = report(100, request.post_data_json['siteId'])
            r['status'] = state['generation_status']
            return ok(r)
        if path.startswith('/reports/') and path.endswith('/content'):
            if state['download_error']: return fail()
            return route.fulfill(content_type='application/pdf', body=b'%PDF-1.4\n% fixture\n%%EOF')
        if path == '/reports/history':
            if state['history_error']: return fail()
            p, limit = int(q['page'][0]), int(q['limit'][0])
            mode = q['siteId'][0]
            return ok([report(i, mode) for i in range((p-1)*limit, min(p*limit, 25))], {'total': 25, 'totalPages': (25+limit-1)//limit, 'page': p, 'limit': limit})
        if path == '/incidents':
            mode = q['siteId'][0]
            if mode == 'slow': held.append(route); return
            if mode == 'denied': return fail(403)
            p, limit = int(q['page'][0]), int(q['limit'][0])
            total = 0 if mode == 'empty' else 5001 if mode == 'limit' else 201 if mode == 'closed-limit' else 105
            if mode == 'page-error' and p == 2: return fail()
            values = [incident(i, mode) for i in range((p-1)*limit, min(p*limit, total))]
            # The test data is filtered by the requested interval just as the API should be.
            lower, upper = datetime.fromisoformat(q['fromDate'][0].replace('Z', '+00:00')), datetime.fromisoformat(q['toDate'][0].replace('Z', '+00:00'))
            if not lower <= start <= upper: values, total = [], 0
            if mode == 'metadata': return ok(values)
            return ok(values, {'total': total, 'totalPages': (total+limit-1)//limit, 'page': p, 'limit': limit})
        if path.startswith('/incidents/'):
            mode, i = path.split('/')[-1].rsplit('-', 1)
            i = int(i)
            if mode == 'detail-error': return fail()
            value = incident(i, mode)
            if mode != 'closed-history':
                value['statusHistory'] = [dict(id=f'h-{i}', incidentId=value['id'], oldStatus='RESOLVED' if i % 10 == 4 else 'DISMISSED', newStatus='CLOSED', changedBy='author', changedAt=(start+timedelta(hours=3)).isoformat())]
            return ok(value)
        raise AssertionError(f'Unexpected API request: {request.method} {path}')

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            context.route('**/api/v1/**', api)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base)
            page.wait_for_load_state('networkidle')
            expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_be_visible()
            expect(page.locator('tbody tr')).to_have_count(10)
            assert len([r for r in requests if r[0] == '/incidents']) == 2, 'Hourly query should reuse the period collection'
            assert len([r for r in requests if r[0].startswith('/incidents/')]) == 21
            assert not any(r[0].startswith('/statistics') for r in requests)
            assert not any(r[0] in ('/cameras', '/sites') for r in requests)
            print('PASS shared source, confirmed CLOSED semantics, complete pages, hourly reuse', flush=True)
            before = len([r for r in requests if r[0] == '/incidents'])
            with page.expect_response(lambda response: '/incidents?' in response.url and parse_qs(urlparse(response.url).query).get('page') == ['2']):
                page.get_by_role('button', name='Invalidate after review', exact=True).click()
            page.wait_for_load_state('networkidle')
            expect(page.get_by_text('Đang cập nhật dữ liệu…', exact=True)).to_have_count(0)
            assert len([r for r in requests if r[0] == '/incidents']) == before + 2, [r for r in requests if r[0] == '/incidents']
            print('PASS analytics refreshes after an incident mutation invalidates list queries', flush=True)

            page.get_by_role('button', name='Trang tiếp theo', exact=True).click()
            expect(page.locator('tbody tr').first).to_contain_text('normal-report-10.pdf')
            assert any(r[0] == '/reports/history' and r[1].get('page') == ['2'] for r in requests)
            expect(page.locator('tbody tr').first.get_by_role('button', name='Tải về', exact=True)).to_be_enabled()
            expect(page.locator('tbody tr').nth(1).get_by_role('button', name='Tải về', exact=True)).to_be_disabled()
            page.get_by_role('combobox', name='Scenario', exact=True).select_option('other')
            expect(page.locator('tbody tr').first).to_contain_text('other-report-0.pdf')
            expect(page.locator('tbody')).not_to_contain_text('normal-report')
            print('PASS server history pagination, site reset and owner access', flush=True)

            page.get_by_role('button', name='Toggle incident permission', exact=True).click()
            expect(page.get_by_text('Bạn không có quyền đọc dữ liệu sự cố của công trường này.', exact=True).first).to_be_visible()
            expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_have_count(0)
            page.get_by_role('button', name='Toggle incident permission', exact=True).click()
            expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_be_visible()
            page.get_by_role('button', name='Toggle export permission', exact=True).click()
            expect(page.get_by_role('button', name='Tải Báo cáo PDF', exact=True)).to_have_count(0)
            expect(page.locator('tbody tr').first.get_by_role('button', name='Tải về', exact=True)).to_be_disabled()
            page.get_by_role('button', name='Toggle export permission', exact=True).click()
            print('PASS permission revocation hides analytics and disables files', flush=True)

            # Invalid range must not issue a request; hourly date is independent.
            before = len([r for r in requests if r[0] == '/incidents'])
            page.get_by_label('Từ ngày', exact=True).fill('2020-01-01')
            expect(page.get_by_text('Chọn ngày hợp lệ, không ở tương lai, từ ngày không sau đến ngày và tối đa 90 ngày.', exact=True)).to_be_visible()
            page.wait_for_load_state('networkidle')
            assert len([r for r in requests if r[0] == '/incidents']) == before + 1, 'Only independent hourly date may load'
            assert writes == []
            page.get_by_role('button', name='7 ngày', exact=True).click()
            expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_be_visible()
            page.get_by_role('button', name='Switch user', exact=True).click()
            expect(page.locator('tbody tr').first.get_by_role('button', name='Tải về', exact=True)).to_be_disabled()
            assert len([r for r in requests if r[0] == '/reports/history' and r[1].get('siteId') == ['other']]) >= 2
            page.get_by_role('button', name='Switch user', exact=True).click()
            print('PASS date validation, independent hour and user-scoped cache', flush=True)

            for mode, text in [('empty', 'Chưa ghi nhận sự cố trong khoảng thời gian này.'), ('limit', 'vượt 5.000 sự cố'), ('closed-limit', 'vượt 200 hồ sơ đã đóng'), ('closed-history', 'thiếu lịch sử của hồ sơ đã đóng'), ('page-error', 'không tải được đầy đủ dữ liệu'), ('metadata', 'không tải được đầy đủ dữ liệu'), ('detail-error', 'không tải được đầy đủ dữ liệu'), ('denied', 'Bạn không có quyền đọc dữ liệu sự cố')]:
                page.get_by_role('combobox', name='Scenario', exact=True).select_option(mode)
                expect(page.get_by_text(text, exact=False).first).to_be_visible()
                expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_have_count(0)
            print('PASS empty, limits, missing history, page/detail errors, metadata and denied access', flush=True)

            page.get_by_role('combobox', name='Scenario', exact=True).select_option('slow')
            expect(page.get_by_text('Đang tải và xác minh đầy đủ sự cố…', exact=True).first).to_be_visible()
            page.get_by_role('combobox', name='Scenario', exact=True).select_option('normal')
            expect(page.get_by_text('Tổng vi phạm đã xác nhận: 53', exact=True)).to_be_visible()
            page.wait_for_load_state('networkidle')
            state['download_error'] = True
            with page.expect_response(lambda response: '/reports/' in response.url and response.url.endswith('/content')) as download_response:
                page.get_by_role('button', name='Tải Báo cáo PDF', exact=True).click()
            assert download_response.value.status == 503
            expect(page.get_by_text('Đã tạo và tải báo cáo thành công.', exact=True)).to_have_count(0)
            expect(page.locator('.ppe-toast').filter(has_text='Đã xảy ra lỗi').first).to_be_visible()
            expect(page.get_by_role('button', name='Tải Báo cáo PDF', exact=True)).to_be_enabled()
            assert len(writes) == 1
            state['download_error'] = False
            downloads_before = len([r for r in requests if r[0].endswith('/content')])
            for generation_status, notice in [('PENDING', 'Yêu cầu đã được ghi nhận.'), ('FAILED', 'Tạo báo cáo thất bại.')]:
                state['generation_status'] = generation_status
                with page.expect_response(lambda response: response.url.endswith('/reports/generate')):
                    page.get_by_role('button', name='Tải Báo cáo PDF', exact=True).click()
                expect(page.locator('.ppe-toast').filter(has_text=notice).first).to_be_visible()
                expect(page.get_by_role('button', name='Tải Báo cáo PDF', exact=True)).to_be_enabled()
            assert len([r for r in requests if r[0].endswith('/content')]) == downloads_before
            state['generation_status'] = 'COMPLETED'
            print('PASS pending/failed generation never starts a file download', flush=True)
            print('PASS rapid site changes cancel loading, failed downloads do not claim success', flush=True)

            state['history_error'] = True
            page.get_by_role('button', name='Làm mới', exact=True).last.click()
            expect(page.get_by_role('alert').filter(has_text='Không thể tải dữ liệu.')).to_be_visible()
            state['history_error'] = False
            page.get_by_role('button', name='Thử lại', exact=True).click()
            expect(page.locator('tbody tr')).to_have_count(10)
            page.get_by_role('button', name='Clear notifications', exact=True).click()
            expect(page.locator('.ppe-toast')).to_have_count(0, timeout=3000)
            trend = page.get_by_role('heading', name='Xu hướng Vi phạm theo Thời gian', exact=True).locator('xpath=ancestor::section[1]')
            ranking = page.get_by_role('heading', name='Xếp hạng Điểm nóng Rủi ro theo Camera', exact=True).locator('xpath=ancestor::*[contains(@class, "h-full")][1]')
            assert trend.bounding_box()['height'] < 800
            assert ranking.bounding_box()['height'] < 600
            page.screenshot(path=str(artifacts / 'analytics-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.screenshot(path=str(artifacts / 'analytics-mobile.png'), full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile page should not overflow horizontally'
            assert errors == [], errors
            print('PASS history error/retry, desktop/mobile render, no browser errors', flush=True)
            for route in held:
                try: route.abort()
                except Exception: pass
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
