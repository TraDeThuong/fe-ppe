"""
Test E2E cho Bước 7.2 — trang /reset-password thật (react-hook-form + zod + checklist policy).

Chạy: python3 scripts/test-step7-2-reset-password-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- Luồng thành công được test bằng mock route Playwright (không đụng DB).
- Token rác gửi BE thật → 400 TOKEN_INVALID (resetPasswordSchema không có captcha).
- BE thu hồi TOÀN BỘ session khi reset thành công — hook useResetPassword dọn
  cache + tokenStore + setUser(null) → màn thành công không bị guard (public) đá đi.

Bao phủ:
- Link thiếu token → màn "liên kết không hợp lệ" + nút yêu cầu liên kết mới
- Render form + checklist policy 5 tiêu chí
- Validation client (zod): thiếu mật khẩu, mật khẩu yếu
- Checklist realtime: gõ đủ mạnh → 5/5 tiêu chí xanh
- 400 TOKEN_INVALID (BE thật) → banner + nút yêu cầu liên kết mới
- Mock 400 TOKEN_EXPIRED → banner hết hạn
- Mock 422 → lỗi map đúng field
- Mock 200 → màn thành công → nút về /login
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

results = []


def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond))
    suffix = f" — {extra}" if extra else ""
    print(("  ✅ " if cond else "  ❌ ") + name + suffix)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Link thiếu token → màn "liên kết không hợp lệ" ────────
            page.goto(f"{BASE}/reset-password", wait_until="load")
            page.wait_for_selector("[data-testid=reset-password-invalid-link]", timeout=10000)
            invalid_text = page.locator("[data-testid=reset-password-invalid-link]").inner_text()
            check("1a. Thiếu token → màn Liên kết không hợp lệ",
                  "Liên kết không hợp lệ" in invalid_text, invalid_text[:80])
            check("1b. Có nút Yêu cầu liên kết mới",
                  page.locator("button:has-text('Yêu cầu liên kết mới')").count() > 0)
            check("1c. Có link Về trang đăng nhập ở footer",
                  page.locator("a:has-text('Về trang đăng nhập')").count() > 0)
            page.screenshot(path="/tmp/ppe-reset-password-invalid-link.png", full_page=True)

            # ── 2. Nút Yêu cầu liên kết mới → /forgot-password ──────────
            page.click("button:has-text('Yêu cầu liên kết mới')")
            page.wait_for_url("**/forgot-password", timeout=10000)
            check("2. Nút Yêu cầu liên kết mới → chuyển /forgot-password",
                  "forgot-password" in page.url, page.url)

            # ── 3. Có token → form + checklist policy ────────────────────
            page.goto(f"{BASE}/reset-password?token=token-rac", wait_until="load")
            page.wait_for_selector("form", timeout=10000)
            check("3a. Có token → render form nhập mật khẩu mới",
                  page.locator("form").count() == 1
                  and page.locator('input[autocomplete="new-password"]').count() == 1)
            check("3b. Checklist policy 5 tiêu chí hiển thị",
                  page.locator("ul li").count() == 5
                  and page.locator("ul li[data-satisfied='true']").count() == 0)
            page.screenshot(path="/tmp/ppe-reset-password-form.png", full_page=True)

            # ── 4. Validation client (zod) ───────────────────────────────
            page.click("button[type=submit]")
            page.wait_for_selector("text=Vui lòng nhập mật khẩu mới.", timeout=5000)
            check("4a. Thiếu mật khẩu → lỗi inline zod", True)

            page.fill('input[autocomplete="new-password"]', "weak")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Mật khẩu mới chưa đáp ứng đủ các yêu cầu.", timeout=5000)
            check("4b. Mật khẩu yếu → lỗi inline zod", True)

            # ── 5. Checklist realtime theo từng ký tự gõ ─────────────────
            page.fill('input[autocomplete="new-password"]', "Aa1")
            page.wait_for_timeout(300)
            check("5a. 'Aa1' → 3/5 tiêu chí đạt (độ dài + hoa + thường chưa đủ 8 ký tự)",
                  page.locator("ul li[data-satisfied='true']").count() == 3,
                  str(page.locator("ul li[data-satisfied='true']").count()) + "/5")
            page.fill('input[autocomplete="new-password"]', "Password1!")
            page.wait_for_timeout(300)
            check("5b. 'Password1!' → 5/5 tiêu chí đạt",
                  page.locator("ul li[data-satisfied='true']").count() == 5)

            # ── 6. Token rác gửi BE thật → 400 TOKEN_INVALID ─────────────
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=15000)
            banner = page.locator("form [role=alert]").inner_text()
            check("6a. TOKEN_INVALID (BE thật) → banner liên kết không hợp lệ",
                  "không hợp lệ" in banner, banner[:80])
            check("6b. Banner kèm nút Yêu cầu liên kết mới",
                  page.locator("form [role=alert] button:has-text('Yêu cầu liên kết mới')").count() > 0)
            page.screenshot(path="/tmp/ppe-reset-password-token-invalid.png", full_page=True)

            # ── 7. Mock 400 TOKEN_EXPIRED → banner hết hạn ───────────────
            def mock_expired(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TOKEN_EXPIRED",
                        "message": "Reset token has expired",
                    },
                )

            page.route("**/auth/reset-password", mock_expired)
            page.fill('input[autocomplete="new-password"]', "Password1!")
            page.click("button[type=submit]")
            page.wait_for_selector("text=đã hết hạn", timeout=10000)
            check("7. TOKEN_EXPIRED → banner liên kết đã hết hạn", True)
            page.unroute("**/auth/reset-password")

            # ── 8. Mock 422 → lỗi map đúng field ─────────────────────────
            def mock_422(route):
                route.fulfill(
                    status=422,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "VALIDATION_ERROR",
                        "message": "Validation failed",
                        "errors": [
                            {"field": "newPassword", "message": "Password must be at least 8 characters"}
                        ],
                    },
                )

            page.route("**/auth/reset-password", mock_422)
            page.fill('input[autocomplete="new-password"]', "Password1!")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Password must be at least 8 characters", timeout=10000)
            check("8. 422 từ BE → message gắn dưới đúng field", True)
            page.unroute("**/auth/reset-password")

            # ── 9. Mock 200 → màn thành công → về /login ─────────────────
            def mock_200(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "message": "Password reset successfully",
                    },
                )

            page.route("**/auth/reset-password", mock_200)
            page.fill('input[autocomplete="new-password"]', "Password1!")
            page.click("button[type=submit]")
            page.wait_for_selector("[data-testid=reset-password-success]", timeout=10000)
            success_text = page.locator("[data-testid=reset-password-success]").inner_text()
            check("9a. Thành công → màn Đặt lại mật khẩu thành công",
                  "Đặt lại mật khẩu thành công" in success_text, success_text[:80])
            page.screenshot(path="/tmp/ppe-reset-password-success.png", full_page=True)
            page.click("button:has-text('Đăng nhập ngay')")
            page.wait_for_url("**/login", timeout=10000)
            check("9b. Nút Đăng nhập ngay → chuyển /login", "login" in page.url, page.url)
            page.unroute("**/auth/reset-password")

            # ── 10. Không console error bất thường ───────────────────────
            # 400 TOKEN_INVALID là lỗi nghiệp vụ do test cố tình gây ra;
            # 404 "Failed to load resource" đến từ AuthShell slideshow dò ảnh minh họa
            # (auth-illustration-6..100 chưa tồn tại — hành vi có chủ đích của AuthShell)
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "400" not in e and "Bad Request" not in e
                and "401" not in e and "Unauthorized" not in e
                and "403" not in e and "Forbidden" not in e
                and "422" not in e
                and "423" not in e and "Locked" not in e
                and "429" not in e
                and "500" not in e and "Internal Server Error" not in e
                and "status of 404" not in e
                and "stream-ticket" not in e
                # Nhiễu nội bộ của widget Cloudflare Turnstile (chỉ xuất hiện khi có
                # site key thật — widget tự log + tự thử kết nối data: bị CSP chặn)
                and "font-size:0;color:transparent" not in e
                and "Connecting to 'data:,'" not in e
                and "cannot load data:," not in e
            ]
            check("10. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-reset-password-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
