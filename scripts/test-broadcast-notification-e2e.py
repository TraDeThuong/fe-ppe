"""Regression for the production broadcast form with mocked APIs; no real messages are sent."""
import argparse
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
parser.add_argument('--artifacts', default='/tmp/ppe-broadcast-e2e')
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ppe-broadcast-') as temp:
    out = Path(temp)
    (out / 'empty.js').write_text('')
    build = dict(entryPoints=[str(ROOT / 'scripts/broadcast-notification-fixture.tsx')], bundle=True, outfile=str(out / 'app.js'),
        banner={'js': "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"}, logOverride={'assign-to-define': 'silent'},
        platform='browser', jsx='automatic', tsconfig=str(ROOT / 'tsconfig.json'), alias={'client-only': str(out / 'empty.js')},
        define={'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_API_BASE_URL': '"/api/v1"', 'process.env.NEXT_PUBLIC_APP_URL': '"http://localhost"', 'process.env.NEXT_PUBLIC_IDENTITY_URL': '"/api/v1"', 'process.argv': '[]'})
    subprocess.run(['node', '-e', 'require("esbuild").buildSync(' + json.dumps(build) + ')'], cwd=ROOT, check=True)
    subprocess.run(['node', '-e', """(async () => {
      const fs=require('node:fs'), {compile}=require('@tailwindcss/node'), {Scanner}=require('@tailwindcss/oxide');
      const root=process.cwd(); const c=await compile(fs.readFileSync(root+'/app/globals.css','utf8'),{base:root+'/app',onDependency:()=>{}});
      fs.writeFileSync(process.argv[1],c.build(new Scanner({sources:c.sources}).scan()));
    })().catch(e=>{console.error(e);process.exit(1)});""", str(out / 'style.css')], cwd=ROOT, check=True)
    (out / 'index.html').write_text('<html lang="vi" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=temp))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    writes, errors, held, notifications = [], [], [], []
    reads = {'inbox': 0, 'unread': 0}
    state = {'mode': 'validation'}
    def api(route):
        path = urlparse(route.request.url).path.removeprefix('/api/v1')
        def ok(data, meta=None):
            body = dict(success=True, data=data)
            if meta is not None: body['meta'] = meta
            route.fulfill(json=body)
        if path == '/system/public': return ok({})
        if path == '/notifications/unread-count':
            reads['unread'] += 1
            return ok(dict(unreadCount=len(notifications)))
        if path == '/notifications':
            reads['inbox'] += 1
            reads['unread'] += 1  # Unread count now derives from the shared normalized inbox.
            limit = int(parse_qs(urlparse(route.request.url).query).get('limit', ['100'])[0])
            return ok(notifications, dict(page=1, limit=limit, total=len(notifications), totalPages=1 if notifications else 0))
        if path == '/notifications/broadcast':
            writes.append(route.request.post_data_json)
            mode = state['mode']
            if mode == 'validation': return route.fulfill(status=422, json=dict(success=False, code='VALIDATION_ERROR', message='Validation failed', errors=[dict(field='actionUrl', message='actionUrl must be a valid public HTTPS URL')]))
            if mode == 'permission': return route.fulfill(status=403, json=dict(success=False, code='FORBIDDEN', message='Forbidden'))
            if mode == 'server': return route.fulfill(status=503, json=dict(success=False, code='INTERNAL_ERROR', message='Dịch vụ thông báo tạm thời không khả dụng.'))
            if mode == 'network': return route.abort('failed')
            if mode == 'hold': held.append(route); return
        raise AssertionError(f'Unexpected API: {route.request.method} {path}')
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport=dict(width=1366, height=900))
            page.route('**/api/v1/**', api)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}')
            page.get_by_role('button', name='Mở form phát thông báo').click()
            dialog = page.get_by_role('dialog')
            title = dialog.get_by_label('Tiêu đề thông báo *', exact=True)
            content = dialog.get_by_label('Nội dung thông báo *', exact=True)
            url = dialog.get_by_label('Đường dẫn hành động (Tùy chọn)', exact=True)
            send = dialog.get_by_role('button', name='Phát thông báo ngay', exact=True)
            expect(send).to_be_disabled()
            title.fill('Kiểm thử thông báo')
            content.fill('Nội dung được giữ khi phát thông báo thất bại.')
            for invalid in ['sgagasdask', '/incidents', 'javascript:alert(1)', '//example.com/incidents']:
                url.fill(invalid)
                send.click()
                expect(url).to_have_attribute('aria-invalid', 'true')
                expect(url).to_be_focused()
                expect(dialog.get_by_role('alert')).to_contain_text('Nhập URL đầy đủ')
                assert len(writes) == 0, 'client-invalid URLs must not call broadcast'
            page.screenshot(path=str(artifacts / 'invalid-url-desktop.png'), full_page=True)
            # Server can reject a syntactically correct URL (e.g. private address in production).
            url.fill('https://example.com/incidents')
            send.click()
            expect(dialog).to_contain_text('Máy chủ từ chối dữ liệu thông báo')
            expect(dialog).to_contain_text('actionUrl must be a valid public HTTPS URL')
            expect(title).to_have_value('Kiểm thử thông báo')
            expect(content).to_have_value('Nội dung được giữ khi phát thông báo thất bại.')
            assert not errors, 'mutateAsync rejection must be caught by the form'
            # Non-validation failures are also visible in the form and preserve the draft.
            for mode, message in [('permission', 'Tài khoản không có quyền phát thông báo toàn hệ thống.'), ('server', 'Dịch vụ thông báo tạm thời không khả dụng.'), ('network', 'Không thể kết nối đến máy chủ.')]:
                state['mode'] = mode
                send.click()
                expect(dialog.get_by_role('alert').first).to_contain_text(message)
                expect(content).to_have_value('Nội dung được giữ khi phát thông báo thất bại.')
            page.set_viewport_size(dict(width=390, height=844))
            state['mode'] = 'validation'
            send.click()
            expect(dialog).to_contain_text('Máy chủ từ chối dữ liệu thông báo')
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.screenshot(path=str(artifacts / 'server-validation-mobile.png'), full_page=True)
            # Optional blank URL is omitted. Sending locks the form and duplicate submissions.
            url.fill('')
            state['mode'] = 'hold'
            send.click()
            expect(dialog.get_by_role('button', name='Đang phát...', exact=True)).to_be_disabled()
            expect(title).to_be_disabled()
            expect(content).to_be_disabled()
            page.keyboard.press('Escape')
            expect(dialog).to_be_visible()
            count = len(writes)
            dialog.locator('form').evaluate('(form) => form.dispatchEvent(new SubmitEvent("submit", {bubbles:true,cancelable:true}))')
            assert len(writes) == count
            assert 'actionUrl' not in writes[-1]
            before = dict(reads)
            notifications.append(dict(id='synthetic-broadcast', userId='fixture-user', title=writes[-1]['title'], content=writes[-1]['content'], severity='NORMAL', status='SENT', channel='IN_APP', createdAt='2026-11-18T09:00:00Z'))
            assert len(held) == 1
            held.pop().fulfill(status=201, json=dict(success=True, data=dict(totalRecipients=1)))
            expect(dialog).not_to_be_visible()
            expect(page.get_by_test_id('unread')).to_contain_text('Chưa đọc: 1')
            expect(page.get_by_role('listitem')).to_contain_text('Kiểm thử thông báo')
            assert reads['inbox'] > before['inbox'] and reads['unread'] > before['unread']
            expect(page.get_by_text('Đã phát thông báo toàn hệ thống thành công.', exact=True)).to_be_visible()
            page.get_by_role('button', name='Mở form phát thông báo').click()
            expect(title).to_have_value('')
            expect(content).to_have_value('')
            expect(url).to_have_value('')
            expect(dialog.get_by_role('alert')).to_have_count(0)
            assert not errors, errors
            browser.close()
            print('PASS: invalid URL/no request, inline 422/403/503/network errors, draft preservation, pending/duplicate guard, success refresh/reset, desktop/mobile. No real broadcast sent.')
            (artifacts / 'result.json').write_text(json.dumps(dict(passed=True, syntheticBroadcasts=len(writes), uncaughtErrors=errors), indent=2))
    finally:
        server.shutdown()
