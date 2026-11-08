"""Isolated browser regression suite for the real table components. No backend writes.
Run: python3 scripts/test-tables-e2e.py
"""
import json
import sys
sys.stdout.reconfigure(line_buffering=True)
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="ppe-tables-") as temp:
    out = Path(temp)
    (out / "empty.js").write_text("")
    build = {
        "entryPoints": [str(ROOT / "scripts/table-fixture.tsx")], "bundle": True, "outfile": str(out / "app.js"), "banner": {"js": "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"}, "logOverride": {"assign-to-define": "silent"}, "platform": "browser", "jsx": "automatic", "tsconfig": str(ROOT / "tsconfig.json"),
        "alias": {"client-only": str(out / "empty.js")},
        "define": {"process.env.NODE_ENV": '"test"', "process.env.NEXT_PUBLIC_API_BASE_URL": '"/api/v1"', "process.env.NEXT_PUBLIC_APP_URL": '"http://localhost"', "process.env.NEXT_PUBLIC_IDENTITY_URL": '"/api/v1"', "process.argv": "[]"},
    }
    subprocess.run(["node", "-e", "require('esbuild').buildSync(" + json.dumps(build) + ")"], cwd=ROOT, check=True)
    css_files = list((ROOT / ".next").glob("**/static/**/*.css"))
    css = "\n".join(path.read_text() for path in css_files[:3])
    (out / "style.css").write_text(css)
    (out / "index.html").write_text('<html lang="vi" data-theme="light"><head><link rel="stylesheet" href="/style.css"></head><body style="margin:24px;background:#e6e9ef"><main id="root"></main><script src="/app.js"></script></body></html>')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=temp))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    users = [dict(id=f"user-{i}", fullName=f"User {i:02}", email=f"user{i}@example.test", isActive=True, roleId="r1", role={"name": "USER"}, createdAt="2026-11-07T00:00:00Z") for i in range(35)]
    requests = []
    writes = []
    failures = set()
    def api(route):
        request = route.request
        url = urlparse(request.url)
        query = parse_qs(url.query)
        path = url.path.removeprefix("/api/v1")
        requests.append((path, query))
        if request.method not in ("GET", "OPTIONS"):
            writes.append((request.method, path, request.post_data_json))
            if path.split("/")[-1] in failures:
                return route.fulfill(status=400, json={"success": False, "message": "Fixture failure"})
            return route.fulfill(json={"success": True, "data": {"message": "ok", "id": path.split("/")[-1]}})
        if path == "/users":
            data = [u for u in users if query.get("search", [""])[0].lower() in (u["fullName"] + u["email"]).lower()]
            if query.get("sortBy") == ["fullName"]: data = sorted(data, key=lambda u: u["fullName"], reverse=query.get("order") == ["desc"])
            page = int(query.get("page", [1])[0]); limit = int(query.get("limit", [10])[0])
            return route.fulfill(json={"success": True, "data": data[(page-1)*limit:page*limit], "meta": {"total": len(data), "totalPages": (len(data)+limit-1)//limit, "page": page, "limit": limit}})
        if path == "/rbac/roles":
            return route.fulfill(json={"success": True, "data": [{"id": "r1", "name": "USER", "permissions": []}], "meta": {"total": 1, "totalPages": 1}})
        if path.endswith("/emails"):
            return route.fulfill(json={"success": True, "data": [{"id": "email-1", "toEmail": "receiver@example.test", "subject": "Alert", "templateKey": "ALERT", "status": "FAILED", "attempts": 3}], "meta": {"total": 21, "totalPages": 3, "page": int(query.get("page", [1])[0]), "limit": 10}})
        if path.endswith("/templates"):
            return route.fulfill(json={"success": True, "data": [], "meta": {"total": 0, "totalPages": 1}})
        return route.fulfill(json={"success": True, "data": [], "meta": {"total": 0, "totalPages": 1}})
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 1000})
            context.route("**/api/v1/**", api)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: (errors.append(str(error)), print("BROWSER ERROR:", error, flush=True)))
            page.goto(base); page.wait_for_load_state("networkidle")
            expect(page.locator("tbody tr")).to_have_count(10)
            page.get_by_role("button", name="Trang tiếp theo", exact=True).click()
            expect(page.locator("tbody tr").first).to_contain_text("Record 10")
            page.get_by_role("checkbox", name="Chọn dòng 10", exact=True).click()
            expect(page.get_by_role("toolbar", name="Thao tác hàng loạt")).to_be_visible()
            expect(page.get_by_test_id("opened")).to_have_text("0")
            page.get_by_role("button", name="Trang tiếp theo", exact=True).click()
            expect(page.get_by_role("toolbar", name="Thao tác hàng loạt")).to_have_count(0)
            page.get_by_role("searchbox").fill("Record 01")
            expect(page.locator("tbody tr")).to_have_count(1)
            page.get_by_role("searchbox").fill("")
            page.get_by_role("checkbox", name="Chọn dòng 0", exact=True).click()
            page.get_by_role("combobox", name="Category", exact=True).select_option("alpha")
            expect(page.get_by_role("toolbar", name="Thao tác hàng loạt")).to_have_count(0)
            expect(page.locator("tbody tr")).to_have_count(10)
            expect(page.locator("[data-table-root]")).to_contain_text("12 / 25")
            page.get_by_role("combobox", name="Category", exact=True).select_option("")
            page.get_by_role("button", name="Name:").click()
            expect(page.locator("th[aria-sort=ascending]")).to_have_count(1)
            page.get_by_role("button", name="Cột", exact=True).click()
            expect(page.get_by_role("dialog", name="Hiển thị cột").get_by_role("checkbox")).to_have_count(2)
            toggle = page.get_by_role("dialog", name="Hiển thị cột").locator("label").filter(has_text="Category").locator("input")
            toggle.uncheck()
            expect(page.locator("thead")).not_to_contain_text("Category")
            page.get_by_role("button", name="Cột", exact=True).click()
            first = page.locator("tbody tr").first
            first.get_by_role("button", name="Thao tác", exact=True).click()
            page.get_by_role("menuitem", name="Open record").focus()
            page.keyboard.press("Enter")
            expect(page.get_by_test_id("opened")).to_have_text("1")
            page.get_by_text("Simulate failure", exact=True).click()
            expect(page.get_by_role("alert")).to_be_visible()
            expect(page.locator("tbody tr")).to_have_count(10)
            page.get_by_role("button", name="Thử lại", exact=True).click()
            expect(page.get_by_role("alert")).to_have_count(0)
            page.get_by_role("combobox", name="Số dòng", exact=True).select_option("20")
            expect(page.locator("tbody tr")).to_have_count(20)
            page.get_by_role("combobox", name="Số dòng", exact=True).select_option("50")
            expect(page.locator("tbody tr")).to_have_count(25)
            page.get_by_role("combobox", name="Số dòng", exact=True).select_option("10")
            page.get_by_role("button", name="Trang cuối", exact=True).click()
            page.get_by_text("Shrink data", exact=True).click()
            expect(page.locator("tbody tr")).to_have_count(5)
            expect(page.locator("tbody tr").first).to_contain_text("Record 00")
            print("PASS core: paging, page selection, filters, counts, sorting, columns, keyboard, retry")
            page.goto(base + "/?demo=users"); page.wait_for_load_state("networkidle")
            expect(page.locator("tbody tr")).to_have_count(10)
            expect(page.locator("[data-table-root]")).to_contain_text("35 bản ghi")
            page.get_by_role("button", name="Trang tiếp theo", exact=True).click()
            expect(page.locator("tbody tr").first).to_contain_text("User 10")
            page.get_by_role("searchbox").fill("User 03")
            expect(page.locator("tbody tr")).to_have_count(1)
            assert any(path == "/users" and q.get("search") == ["User 03"] and q.get("page") == ["1"] for path,q in requests)
            page.get_by_role("button", name="Người dùng:").click()
            page.wait_for_load_state("networkidle")
            assert any(path == "/users" and q.get("sortBy") == ["fullName"] for path,q in requests)
            page.locator("tbody tr").first.get_by_role("button", name="Thao tác", exact=True).click()
            page.get_by_role("menuitem", name="Vô hiệu hóa", exact=True).click()
            dialog = page.get_by_role("alertdialog")
            dialog.get_by_role("button", name="Xác nhận", exact=True).click()
            expect(dialog).to_have_count(0)
            assert any(method == "PUT" and payload == {"isActive": False} for method,path,payload in writes)
            assert not any(method == "DELETE" for method,path,payload in writes)
            print("PASS users: API search, reset page, metadata, sort mapping, deactivate uses PUT")
            page.get_by_role("searchbox").fill("")
            expect(page.locator("tbody tr")).to_have_count(10)
            failures.add("user-1")
            page.get_by_role("checkbox", name="Chọn dòng user-0", exact=True).click()
            page.get_by_role("checkbox", name="Chọn dòng user-1", exact=True).click()
            page.get_by_role("toolbar", name="Thao tác hàng loạt").get_by_role("button", name="Vô hiệu hóa", exact=True).click()
            page.get_by_role("alertdialog").get_by_role("button", name="Xác nhận", exact=True).click()
            expect(page.get_by_role("alertdialog")).to_have_count(0)
            expect(page.get_by_role("checkbox", name="Chọn dòng user-0", exact=True)).not_to_be_checked()
            expect(page.get_by_role("checkbox", name="Chọn dòng user-1", exact=True)).to_be_checked()
            failures.clear()
            print("PASS bulk users: partial failure retains failed selection")
            for demo, text in [("sites", "Site Alpha"), ("roles", "SAFETY"), ("cameras", "Gate Camera"), ("incidents", "incident"), ("audit", "USER"), ("reports", "Safety report"), ("email", "receiver@example.test"), ("templates", ""), ("health", "Service 14"), ("configs", "app.name"), ("models", "v1"), ("telemetry", "incident"), ("site-stats", "Site Alpha"), ("role-stats", "SAFETY")]:
                page.goto(base + "/?demo=" + demo); page.wait_for_load_state("networkidle")
                expect(page.locator("[data-table-root]")).to_be_visible()
                if text: expect(page.locator("tbody")).to_contain_text(text)
                if demo == "health": expect(page.locator("tbody tr")).to_have_count(15)
                print("PASS component:", demo)
            page.goto(base + "/?demo=users&readonly=1"); page.wait_for_load_state("networkidle")
            expect(page.get_by_role("checkbox")).to_have_count(0)
            expect(page.get_by_role("button", name="Tạo người dùng", exact=True)).to_have_count(0)
            page.locator("tbody tr").first.get_by_role("button", name="Thao tác", exact=True).click()
            expect(page.get_by_role("menuitem")).to_have_count(1)
            print("PASS read-only users")
            page.set_viewport_size({"width": 390, "height": 844})
            page.goto(base + "/?demo=templates"); page.wait_for_load_state("networkidle")
            expect(page.locator("[data-table-root]")).to_be_visible()
            page.screenshot(path=str(ROOT / ".next/table-mobile-check.png"), full_page=True)
            assert not errors, errors
            print("PASS mobile and runtime errors (0)")
            browser.close()
    finally:
        server.shutdown()
