"""
Test E2E cho Bước 7.2 — trang /change-password thật (oldPassword + newPassword + checklist).

Chạy: python3 scripts/test-step7-2-change-password-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- KHÔNG đổi mật khẩu admin thật — nhánh thành công dùng mock 200.
- Nhánh BE thật chỉ dùng input an toàn (sai mật khẩu cũ → 401 INVALID_CREDENTIALS,
  không đổi trạng thái).
- Mock 400 BAD_REQUEST giả lập tài khoản Google-only (BE thật chỉ trả khi user
  không có password — admin có password nên không test được trên BE thật).
- Nút "Tạo mật khẩu qua Quên mật khẩu" gọi logout thật (POST /auth/logout) rồi
  chuyển /forgot-password — session admin bị thu hồi, các bước sau đăng nhập lại.

Bao phủ:
- Render form + checklist policy 5 tiêu chí
- zod: thiếu mật khẩu cũ/mới, mật khẩu yếu; checklist realtime 3/5 → 5/5
- 401 INVALID_CREDENTIALS (BE thật) → banner + xóa ô mật khẩu cũ
- Mock 422 → lỗi map đúng field
- Mock 400 BAD_REQUEST (Google-only) → banner + nút logout → /forgot-password
- Mock 200 → dọn session → về /login
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


def login(page) -> None:
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill("#email", EMAIL)
    page.fill("#password", PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_url("**/dashboard", timeout=20000)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Đăng nhập rồi vào /change-password ─────────────────────
            login(page)
            page.goto(f"{BASE}/change-password", wait_until="load")
            page.wait_for_selector('input[autocomplete="current-password"]', timeout=10000)
            check("1a. Form có ô mật khẩu hiện tại + mật khẩu mới",
                  page.locator('input[autocomplete="current-password"]').count() == 1
                  and page.locator('input[autocomplete="new-password"]').count() == 1)
            check("1b. Checklist policy 5 tiêu chí",
                  page.locator("ul li").count() == 5
                  and page.locator("ul li[data-satisfied='true']").count() == 0)
            page.screenshot(path="/tmp/ppe-change-password-form.png", full_page=True)

            # ── 2. zod: thiếu cả 2 ô ──────────────────────────────────────
            page.click("button[type=submit]")
            page.wait_for_selector("text=Vui lòng nhập mật khẩu hiện tại.", timeout=5000)
            check("2a. Thiếu mật khẩu cũ → lỗi inline", True)
            page.fill('input[autocomplete="current-password"]', "Admin@123456")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Vui lòng nhập mật khẩu mới.", timeout=5000)
            check("2b. Thiếu mật khẩu mới → lỗi inline", True)

            # ── 3. zod + checklist realtime ───────────────────────────────
            page.fill('input[autocomplete="new-password"]', "weak")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Mật khẩu mới chưa đáp ứng đủ các yêu cầu.", timeout=5000)
            check("3a. Mật khẩu yếu → lỗi zod", True)

            page.fill('input[autocomplete="new-password"]', "Aa1")
            page.wait_for_timeout(300)
            check("3b. 'Aa1' → 3/5 tiêu chí (độ dài + hoa + thường)",
                  page.locator("ul li[data-satisfied='true']").count() == 3,
                  str(page.locator("ul li[data-satisfied='true']").count()) + "/5")
            page.fill('input[autocomplete="new-password"]', "NewPass1!")
            page.wait_for_timeout(300)
            check("3c. 'NewPass1!' → 5/5 tiêu chí",
                  page.locator("ul li[data-satisfied='true']").count() == 5)

            # ── 4. Sai mật khẩu cũ (BE thật) → 401 INVALID_CREDENTIALS ────
            page.fill('input[autocomplete="current-password"]', "SaiMatKhau1!")
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=15000)
            banner = page.locator("form [role=alert]").inner_text()
            check("4a. 401 (BE thật) → banner lỗi tiếng Việt",
                  "Mật khẩu hiện tại không chính xác" in banner, banner[:80])
            check("4b. Ô mật khẩu cũ bị xóa để nhập lại",
                  page.locator('input[autocomplete="current-password"]').input_value() == "")
            page.screenshot(path="/tmp/ppe-change-password-401.png", full_page=True)

            # ── 5. Mock 422 → lỗi map đúng field ──────────────────────────
            def mock_422(route):
                route.fulfill(
                    status=422,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "VALIDATION_ERROR",
                        "message": "Validation failed",
                        "errors": [
                            {"field": "newPassword", "message": "Mật khẩu mới không được trùng mật khẩu cũ"}
                        ],
                    },
                )

            page.route("**/auth/password", mock_422)
            page.fill('input[autocomplete="current-password"]', "Admin@123456")
            page.fill('input[autocomplete="new-password"]', "NewPass1!")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Mật khẩu mới không được trùng mật khẩu cũ", timeout=10000)
            check("5. 422 từ BE → message gắn dưới đúng field newPassword", True)
            page.unroute("**/auth/password")

            # ── 6. Mock 400 BAD_REQUEST (Google-only) → nút logout → forgot ──
            def mock_bad_request(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "BAD_REQUEST",
                        "message": "Tài khoản liên kết Google chưa có mật khẩu. Vui lòng dùng chức năng Quên mật khẩu để tạo mật khẩu.",
                    },
                )

            page.route("**/auth/password", mock_bad_request)
            page.fill('input[autocomplete="current-password"]', "Admin@123456")
            page.fill('input[autocomplete="new-password"]', "NewPass1!")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Tài khoản liên kết Google chưa có mật khẩu", timeout=10000)
            check("6a. Google-only → banner hướng dẫn + nút chuyển forgot-password",
                  page.locator("form button:has-text('Quên mật khẩu')").count() > 0)
            page.screenshot(path="/tmp/ppe-change-password-google-only.png", full_page=True)
            # Nút logout thật (BE revoke session) rồi chuyển /forgot-password
            page.click("form button:has-text('Quên mật khẩu')")
            page.wait_for_url("**/forgot-password", timeout=15000)
            check("6b. Logout → chuyển /forgot-password (guard public không đá lại)",
                  "forgot-password" in page.url, page.url)
            page.unroute("**/auth/password")

            # ── 7. Đăng nhập lại → mock 200 → về /login ───────────────────
            login(page)
            page.goto(f"{BASE}/change-password", wait_until="load")
            page.wait_for_selector('input[autocomplete="current-password"]', timeout=10000)

            def mock_200(route):
                # BE thật thu hồi toàn bộ session → xóa cookie; Playwright áp dụng
                # Set-Cookie TRỄ hơn JS onSuccess (router.replace chạy trước →
                # proxy thấy cookie cũ → đá /login về "/"). Clear ngay tại handler.
                context.clear_cookies()
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "message": "Đổi mật khẩu thành công"},
                )

            page.route("**/auth/password", mock_200)
            page.fill('input[autocomplete="current-password"]', "Admin@123456")
            page.fill('input[autocomplete="new-password"]', "NewPass1!")
            page.click("button[type=submit]")
            page.wait_for_url("**/login**", timeout=15000)
            check("7. Đổi mật khẩu thành công (mock) → dọn session → về /login",
                  "/login" in page.url, page.url)
            page.unroute("**/auth/password")

            # ── 8. Không console error bất thường ─────────────────────────
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "401" not in e and "Unauthorized" not in e
                and "400" not in e and "Bad Request" not in e
                and "422" not in e
                and "status of 404" not in e
                and "status of 500" not in e  # stream-ticket notifications (hạ tầng BE)
                and "stream-ticket" not in e
                and "font-size:0;color:transparent" not in e
                and "Connecting to 'data:,'" not in e
                and "cannot load data:," not in e
            ]
            check("8. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-change-password-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
