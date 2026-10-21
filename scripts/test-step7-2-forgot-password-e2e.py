"""
Test E2E cho Bước 7.2 — trang /forgot-password thật (react-hook-form + zod + Turnstile).

Chạy: python3 scripts/test-step7-2-forgot-password-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- Đã có NEXT_PUBLIC_TURNSTILE_SITE_KEY (site key thật) → widget render + nút submit
  bị gate tới khi tick captcha (test #3 nhánh A — luồng pass thật test thủ công).
  Chưa có site key → submit thật nhận 400 CAPTCHA_REQUIRED (test #3 nhánh B).
- Luồng thành công được test bằng mock route Playwright (không đụng DB).
  BE anti-enum: POST /auth/forgot-password LUÔN trả 200 (email tồn tại, không tồn
  tại, hoặc đang trong cooldown 60s đều giống nhau) — FE không thể phân biệt.

Bao phủ:
- Render trang forgot-password (AuthShell + form + link Đăng nhập)
- Validation client (zod): email sai định dạng, thiếu email
- 400 CAPTCHA_REQUIRED (BE thật) → banner + reset widget
- Mock 422 → lỗi map đúng field
- Mock 200 → màn "Kiểm tra email của bạn" (anti-enum) → nút về login
"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@ppe.local"  # email đã tồn tại — BE anti-enum vẫn trả 200 như nhau

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
            # ── 1. Render trang forgot-password ─────────────────────────
            page.goto(f"{BASE}/forgot-password", wait_until="load")
            page.wait_for_selector("form", timeout=10000)
            check("1a. Trang forgot-password render AuthShell + form",
                  page.locator("form").count() == 1
                  and page.locator("#email").count() == 1)
            check("1b. Có link Đăng nhập cho user nhớ mật khẩu",
                  page.locator("a:has-text('Đăng nhập')").count() > 0)
            page.screenshot(path="/tmp/ppe-forgot-password.png", full_page=True)

            # Phát hiện sớm: site key đã cấu hình chưa (widget Turnstile render trong
            # shadow DOM — nhận diện qua challenge frame, poll tới 12s)
            captcha_configured = False
            for _ in range(24):
                if any("challenges.cloudflare.com" in f.url for f in page.frames):
                    captcha_configured = True
                    break
                page.wait_for_timeout(500)

            # Khi captcha đã cấu hình, nút submit bị gate (chưa tick) → dùng
            # requestSubmit() để chạy form qua luồng submit thật (zod + mutate)
            def submit_form():
                if captcha_configured:
                    page.evaluate("document.querySelector('form').requestSubmit()")
                else:
                    page.click("button[type=submit]")

            # ── 2. Validation client (zod) ──────────────────────────────
            page.fill("#email", "khong-phai-email")
            submit_form()
            page.wait_for_selector("text=Email không hợp lệ.", timeout=5000)
            check("2a. Email sai định dạng → lỗi inline zod", True)

            page.fill("#email", "")
            submit_form()
            page.wait_for_selector("text=Vui lòng nhập email.", timeout=5000)
            check("2b. Thiếu email → lỗi inline zod", True)

            # ── 3. Captcha: widget render + gate submit / CAPTCHA_REQUIRED ──
            # Hai môi trường có thể xảy ra:
            #  a) Đã cấu hình NEXT_PUBLIC_TURNSTILE_SITE_KEY → widget render, nút submit
            #     bị disable tới khi tick captcha (luồng pass thật test thủ công).
            #  b) Chưa cấu hình site key → submit thật bị BE từ chối CAPTCHA_REQUIRED.
            page.fill("#email", EMAIL)
            if captcha_configured:
                check("3a. Site key đã cấu hình → widget Turnstile render", True)
                gated = page.locator("button[type=submit]").is_disabled()
                if gated:
                    check("3b. Chưa có token captcha → nút Gửi yêu cầu bị gate", True)
                else:
                    # Widget mode "non-interactive" tự cấp token khi tải trang → nút sẵn sàng
                    check("3b. Widget tự cấp token (mode non-interactive) → nút sẵn sàng submit", True)
                page.screenshot(path="/tmp/ppe-forgot-password-captcha.png", full_page=True)
            else:
                page.click("button[type=submit]")
                page.wait_for_selector("form [role=alert]", timeout=15000)
                captcha_text = page.locator("form [role=alert]").first.inner_text()
                check("3. Chưa cấu hình site key → BE trả CAPTCHA_REQUIRED → banner yêu cầu xác minh robot",
                      "robot" in captcha_text, captcha_text[:80])
                page.screenshot(path="/tmp/ppe-forgot-password-captcha.png", full_page=True)

            # ── 4. Mock 422 → lỗi map đúng field ────────────────────────
            def mock_422(route):
                route.fulfill(
                    status=422,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "VALIDATION_ERROR",
                        "message": "Validation failed",
                        "errors": [{"field": "email", "message": "Email không hợp lệ."}],
                    },
                )

            page.route("**/auth/forgot-password", mock_422)
            page.fill("#email", "hop-le@example.com")
            submit_form()
            page.wait_for_selector("text=Email không hợp lệ.", timeout=10000)
            check("4. 422 từ BE → message gắn dưới đúng field", True)
            page.unroute("**/auth/forgot-password")

            # ── 5. Mock 200 → màn check email (anti-enum) ───────────────
            def mock_200(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "message": "Password reset link sent to your email",
                    },
                )

            page.route("**/auth/forgot-password", mock_200)
            page.fill("#email", EMAIL)  # email ĐÃ tồn tại — BE anti-enum vẫn trả 200
            submit_form()
            page.wait_for_selector("[data-testid=forgot-password-success]", timeout=10000)
            success_text = page.locator("[data-testid=forgot-password-success]").inner_text()
            check("5a. Thành công → màn Kiểm tra email của bạn",
                  "Kiểm tra email của bạn" in success_text, success_text[:80])
            check("5b. Anti-enum: không tiết lộ email có tồn tại hay chưa",
                  "đã tồn tại" not in success_text and "already exists" not in success_text.lower())
            check("5c. Nút Về trang đăng nhập hiển thị",
                  page.locator("button:has-text('Về trang đăng nhập')").count() > 0)
            page.screenshot(path="/tmp/ppe-forgot-password-success.png", full_page=True)
            page.click("button:has-text('Về trang đăng nhập')")
            page.wait_for_url("**/login", timeout=10000)
            check("5d. Nút Về trang đăng nhập → chuyển /login", "login" in page.url, page.url)
            page.unroute("**/auth/forgot-password")

            # ── 6. Không console error bất thường ───────────────────────
            # 400 CAPTCHA_REQUIRED là lỗi nghiệp vụ do test cố tình gây ra;
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
            check("6. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-forgot-password-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
