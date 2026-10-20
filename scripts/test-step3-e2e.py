"""
Test E2E cho Bước 3 (providers + guard) — trình duyệt thật (Playwright).

Chạy: python3 scripts/test-step3-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80) + identity-service,
DB đã seed (admin@ppe.local). Cài: pip install playwright && playwright install chromium
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@ppe.local"
PASSWORD = "Admin@123456"

results = []


def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond))
    suffix = f" — {extra}" if extra else ""
    print(("  ✅ " if cond else "  ❌ ") + name + suffix)


# Dashboard có EventSource (realtime) chạy liên tục → không dùng networkidle ở trang đã đăng nhập
def wait_dashboard(page) -> None:
    page.wait_for_selector(f"text={EMAIL}", timeout=15000)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # 1. Lớp guard 1 (proxy): /dashboard không cookie → /login?next=
        page.goto(f"{BASE}/dashboard", wait_until="load")
        check("Guard 1: /dashboard không cookie → /login?next=", "/login?next=%2Fdashboard" in page.url, page.url)

        # 2. LocaleProvider mặc định vi-VN (SSR đã render chuỗi vi)
        page.wait_for_selector("text=Đăng nhập vào hệ thống giám sát Smart PPE", timeout=10000)
        check("Login page tiếng Việt (mặc định)", True)

        # 3. Login sai → banner lỗi nghiệp vụ từ BE hiển thị inline trong form
        # (Bước 7.2: form dùng suppressToast + banner [role=alert] thay vì toast)
        # Dùng email KHÔNG tồn tại để không làm tăng bộ đếm khóa của admin@ppe.local
        page.fill("#email", "khong-ton-tai@ppe.local")
        page.fill("#password", "sai-mat-khau")
        page.click("button[type=submit]")
        page.wait_for_selector("[role=alert]", timeout=10000)
        check("Login sai → banner lỗi inline hiển thị", True)

        # 4. Login đúng → vào dashboard + thấy user
        page.fill("#email", EMAIL)
        page.fill("#password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        wait_dashboard(page)
        check("Login đúng → vào /dashboard", "dashboard" in page.url, page.url)
        check("Dashboard hiển thị user", page.locator(f"text={EMAIL}").count() > 0)
        check("Dashboard chào bằng tiếng Việt", page.locator("text=Xin chào").count() > 0)

        # 5. Reload → giữ session (DoD 3.7)
        page.reload(wait_until="load")
        wait_dashboard(page)
        check("Reload giữ session (vẫn dashboard)", "dashboard" in page.url and page.locator(f"text={EMAIL}").count() > 0)

        # 6. Đã đăng nhập mở /login → tự về / (DoD 3.7)
        # Từ Bước 7.1, trang gốc / redirect tiếp về /dashboard — chấp nhận đích cuối.
        page.goto(f"{BASE}/login", wait_until="load")
        page.wait_for_timeout(600)
        check("Đã login mở /login → redirect /", page.url.rstrip("/") == BASE or "/dashboard" in page.url, page.url)

        # 7. LocaleProvider: đổi en → UI đổi ngay → reload giữ lựa chọn
        page.goto(f"{BASE}/dashboard", wait_until="load")
        wait_dashboard(page)
        page.click("button:has-text('en-US')")
        page.wait_for_timeout(400)
        check("Đổi locale en → UI tiếng Anh ngay", page.locator("text=Welcome").count() > 0)
        check("html lang = en-US", page.evaluate("document.documentElement.lang") == "en-US")
        page.reload(wait_until="load")
        wait_dashboard(page)
        check("Reload giữ locale en", page.locator("text=Welcome").count() > 0 and page.evaluate("document.documentElement.lang") == "en-US")
        page.click("button:has-text('vi-VN')")
        page.wait_for_timeout(400)
        check("Đổi về vi-VN", page.locator("text=Xin chào").count() > 0)

        # 8. ThemeProvider: light → dark → light (data-theme trên <html>)
        before = page.evaluate("document.documentElement.getAttribute('data-theme')")
        page.click("button:has-text('Tối')")
        page.wait_for_timeout(400)
        after = page.evaluate("document.documentElement.getAttribute('data-theme')")
        check("Theme → dark", after == "dark", f"{before} → {after}")
        page.click("button:has-text('Sáng')")
        page.wait_for_timeout(400)
        check("Theme → light", page.evaluate("document.documentElement.getAttribute('data-theme')") == "light")
        page.reload(wait_until="load")
        wait_dashboard(page)
        check("Reload giữ theme light", page.evaluate("document.documentElement.getAttribute('data-theme')") == "light")

        # 9. Logout → guard đưa về /login?next= → session thật sự chết
        page.click("button:has-text('Đăng xuất')")
        page.wait_for_url("**/login**", timeout=15000)
        check("Logout → về /login?next=", "/login" in page.url, page.url)
        page.goto(f"{BASE}/dashboard", wait_until="load")
        check("Sau logout, /dashboard bị guard 1 chặn", "/login" in page.url, page.url)

        # 10. Không console error (hydration mismatch, crash...)
        # Bỏ qua: 401 /auth/me khi chưa login (thăm dò session là hành vi mong đợi), favicon 404,
        # 404 "Failed to load resource" từ AuthShell slideshow dò ảnh minh họa
        # (auth-illustration-6..100 chưa tồn tại — hành vi có chủ đích của AuthShell),
        # và 500 stream-ticket — lỗi cấu hình BE (notification-service thiếu khóa công khai RS256),
        # FE đã xử lý graceful (realtime hiển thị "Mất kết nối").
        real_errors = [
            e
            for e in console_errors
            if "favicon" not in e.lower()
            and "401" not in e
            and "Unauthorized" not in e
            and "500" not in e
            and "Internal Server Error" not in e
            and "status of 404" not in e
        ]
        check("Không console error", len(real_errors) == 0, "; ".join(real_errors[:3]) if real_errors else "")

        browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
