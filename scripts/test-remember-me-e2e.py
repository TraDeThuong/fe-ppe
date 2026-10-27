"""
Test E2E tính năng Ghi nhớ đăng nhập (Remember Me).
Chạy: python3 scripts/test-remember-me-e2e.py
"""
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@ppe.local"
PASSWORD = "Admin@123456"

results = []

def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond))
    suffix = f" — {extra}" if extra else ""
    print(("  ✅ " if cond else "  ❌ ") + name + suffix)

def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ── Test 1: Kiểm tra giao diện checkbox Ghi nhớ đăng nhập ──
        ctx1 = browser.new_context()
        page1 = ctx1.new_page()
        page1.goto(f"{BASE}/login", wait_until="load")
        page1.wait_for_selector("form", timeout=10000)

        checkbox = page1.locator("#rememberMe")
        check("1a. Checkbox Ghi nhớ đăng nhập hiển thị", checkbox.count() == 1)
        label = page1.locator("label[for=rememberMe]")
        check("1b. Label 'Ghi nhớ đăng nhập' hiển thị", "Ghi nhớ đăng nhập" in label.inner_text())
        check("1c. Mặc định chưa được tích", not checkbox.is_checked())

        # ── Test 2: Đăng nhập KHÔNG tích Ghi nhớ đăng nhập ──
        page1.fill("#email", EMAIL)
        page1.fill("#password", PASSWORD)
        # Giữ checkbox không tích
        page1.click("button[type=submit]")
        page1.wait_for_url(f"{BASE}/dashboard", timeout=10000)
        check("2a. Đăng nhập thành công vào /dashboard", page1.url == f"{BASE}/dashboard")

        # Kiểm tra cookie trong context hiện tại
        cookies = ctx1.cookies()
        cookie_names = {c["name"]: c for c in cookies}
        check("2b. Cookie ppe_session_active được tạo", "ppe_session_active" in cookie_names)
        check("2c. Cookie ppe_remember_me KHÔNG tồn tại", "ppe_remember_me" not in cookie_names)

        # F5 tải lại trang: phiên tạm thời vẫn hoạt động
        page1.reload(wait_until="load")
        time.sleep(1)
        check("2d. F5 reload trong phiên vẫn giữ trạng thái đăng nhập", "/dashboard" in page1.url)

        # Đóng browser session (giả lập người dùng đóng trình duyệt và mở lại lần sau)
        ctx1.close()

        # Tạo context mới (giả lập phiên làm việc mới - không có session cookie)
        ctx_new = browser.new_context()
        page_new = ctx_new.new_page()
        page_new.goto(f"{BASE}/dashboard", wait_until="load")
        time.sleep(2)
        check("2e. Lần sau mở lại (trình duyệt mới), không vào được dashboard, bị chuyển hướng về /login",
              "/login" in page_new.url, page_new.url)
        ctx_new.close()

        # ── Test 3: Đăng nhập CÓ tích Ghi nhớ đăng nhập ──
        ctx2 = browser.new_context()
        page2 = ctx2.new_page()
        page2.goto(f"{BASE}/login", wait_until="load")
        page2.wait_for_selector("form", timeout=10000)

        page2.fill("#email", EMAIL)
        page2.fill("#password", PASSWORD)
        # Tích chọn ghi nhớ đăng nhập
        page2.locator("label[for=rememberMe]").click()
        check("3a. Checkbox đã được tích", page2.locator("#rememberMe").is_checked())

        page2.click("button[type=submit]")
        page2.wait_for_url(f"{BASE}/dashboard", timeout=10000)
        check("3b. Đăng nhập thành công vào /dashboard", page2.url == f"{BASE}/dashboard")

        cookies2 = ctx2.cookies()
        cookie_names2 = {c["name"]: c for c in cookies2}
        check("3c. Cookie ppe_remember_me được tạo", "ppe_remember_me" in cookie_names2)

        # Lưu storage state (bao gồm persistent cookies và localStorage)
        storage_path = "/tmp/remember_me_state.json"
        ctx2.storage_state(path=storage_path)
        ctx2.close()

        # Tạo context mới với persistent state (giống như mở lại trình duyệt có persistent cookie)
        ctx_persistent = browser.new_context(storage_state=storage_path)
        page_persistent = ctx_persistent.new_page()
        page_persistent.goto(f"{BASE}/dashboard", wait_until="load")
        time.sleep(2)
        check("3d. Lần sau mở lại tự động vào được dashboard mà không cần nhập mật khẩu",
              "/dashboard" in page_persistent.url, page_persistent.url)
        ctx_persistent.close()

        browser.close()

    total = len(results)
    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ TEST REMEMBER ME: {passed}/{total} đạt")
    if passed < total:
        exit(1)

if __name__ == "__main__":
    main()
