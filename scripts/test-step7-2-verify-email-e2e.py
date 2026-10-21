"""
Test E2E cho Bước 7.2 — trang /verify-email thật (auto-verify ?token= + resend khi hết hạn).

Chạy: python3 scripts/test-step7-2-verify-email-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- Đã có NEXT_PUBLIC_TURNSTILE_SITE_KEY (site key thật) → panel resend có widget
  Turnstile + nút submit bị gate tới khi tick captcha → test dùng form.requestSubmit().
- Mọi luồng được test bằng mock route Playwright (không tiêu thụ token thật,
  không đụng DB). Luồng verify THẬT (link từ email) test thủ công.

Bao phủ:
- Không có token → màn "link không hợp lệ" + nút về login
- Mock 200 → màn thành công → nút về login
- Mock 400 TOKEN_EXPIRED → panel nhập email gửi lại (resend)
- Resend: mock 200 → màn "Kiểm tra email của bạn" (anti-enum)
- Resend: mock 422 → lỗi gắn dưới đúng field
- Mock 400 TOKEN_INVALID → màn link không hợp lệ
- Mock 500 → màn lỗi + nút Thử lại → mock 200 → thành công
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
            # ── 1. Không có token → link không hợp lệ ─────────────────
            page.goto(f"{BASE}/verify-email", wait_until="load")
            page.wait_for_selector("[data-testid=verify-email-invalid]", timeout=10000)
            check("1a. Không có ?token= → màn link không hợp lệ", True)
            check("1b. Trang render trong AuthShell (form/panel + footer)",
                  page.locator("a:has-text('Đăng nhập')").count() > 0)
            page.screenshot(path="/tmp/ppe-verify-invalid.png", full_page=True)

            # ── 2. Mock 200 → thành công → nút về login ───────────────
            verify_calls = {"count": 0}

            def mock_verify_200(route):
                verify_calls["count"] += 1
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "message": "Email verified successfully. You can now log in.",
                    },
                )

            page.route("**/auth/verify-email**", mock_verify_200)
            page.goto(f"{BASE}/verify-email?token=token-hop-le", wait_until="load")
            page.wait_for_selector("[data-testid=verify-email-success]", timeout=10000)
            success_text = page.locator("[data-testid=verify-email-success]").inner_text()
            check("2a. Token hợp lệ → màn xác minh thành công",
                  "Email đã được xác minh" in success_text, success_text[:80])
            check("2c. Verify chỉ gọi ĐÚNG 1 lần (token dùng 1 lần — chống StrictMode double-fire)",
                  verify_calls["count"] == 1, f"gọi {verify_calls['count']} lần")
            page.screenshot(path="/tmp/ppe-verify-success.png", full_page=True)
            page.click("[data-testid=verify-email-success] button:has-text('Về trang đăng nhập')")
            page.wait_for_url("**/login", timeout=10000)
            check("2b. Nút Về trang đăng nhập → chuyển /login", "login" in page.url, page.url)
            page.unroute("**/auth/verify-email**")

            # ── 3. Mock 400 TOKEN_EXPIRED → panel gửi lại ─────────────
            def mock_verify_expired(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TOKEN_EXPIRED",
                        "message": "Verification token has expired",
                    },
                )

            page.route("**/auth/verify-email**", mock_verify_expired)
            page.goto(f"{BASE}/verify-email?token=token-het-han", wait_until="load")
            page.wait_for_selector("#email", timeout=10000)
            check("3a. TOKEN_EXPIRED → panel nhập email gửi lại",
                  page.locator("text=Link xác minh đã hết hạn").count() > 0)
            page.screenshot(path="/tmp/ppe-verify-expired.png", full_page=True)

            # Widget Turnstile render trong shadow DOM → poll challenge frame
            captcha_configured = False
            for _ in range(24):
                if any("challenges.cloudflare.com" in f.url for f in page.frames):
                    captcha_configured = True
                    break
                page.wait_for_timeout(500)
            if captcha_configured:
                check("3b. Widget Turnstile render trong panel resend", True)
                gated = page.locator("button[type=submit]").is_disabled()
                check("3c. Chưa tick captcha → nút Gửi lại bị gate", gated)

            def submit_form():
                if captcha_configured:
                    page.evaluate("document.querySelector('form').requestSubmit()")
                else:
                    page.click("button[type=submit]")

            # ── 4. Resend: mock 200 → màn check email (anti-enum) ─────
            def mock_resend_200(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "message": "Verification email sent successfully",
                    },
                )

            page.route("**/auth/resend-verification", mock_resend_200)
            page.fill("#email", "hop-le@example.com")
            submit_form()
            page.wait_for_selector("[data-testid=verify-email-resend-success]", timeout=10000)
            resend_text = page.locator("[data-testid=verify-email-resend-success]").inner_text()
            check("4a. Resend thành công → màn Kiểm tra email của bạn",
                  "Kiểm tra email của bạn" in resend_text, resend_text[:80])
            check("4b. Anti-enum: không tiết lộ email tồn tại hay chưa",
                  "đã tồn tại" not in resend_text and "exists" not in resend_text.lower())
            page.screenshot(path="/tmp/ppe-verify-resend-success.png", full_page=True)
            page.unroute("**/auth/resend-verification")

            # ── 5. Resend: mock 422 → lỗi gắn đúng field ──────────────
            # (quay lại panel resend: reload với token hết hạn mới)
            page.goto(f"{BASE}/verify-email?token=token-het-han-2", wait_until="load")
            page.wait_for_selector("#email", timeout=10000)

            def mock_resend_422(route):
                route.fulfill(
                    status=422,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "VALIDATION_ERROR",
                        "message": "Validation failed",
                        "errors": [{"field": "email", "message": "Email không tồn tại trong hệ thống."}],
                    },
                )

            page.route("**/auth/resend-verification", mock_resend_422)
            page.fill("#email", "sai-dinh-dang")
            submit_form()
            page.wait_for_selector("text=Email không hợp lệ.", timeout=10000)
            check("5a. Email sai định dạng → lỗi inline zod", True)

            page.fill("#email", "hop-le@example.com")
            submit_form()
            page.wait_for_selector("text=Email không tồn tại trong hệ thống.", timeout=10000)
            check("5b. 422 từ BE → message gắn dưới đúng field email", True)
            page.unroute("**/auth/resend-verification")

            # ── 6. Mock 400 TOKEN_INVALID → link không hợp lệ ─────────
            def mock_verify_invalid(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TOKEN_INVALID",
                        "message": "Invalid verification token",
                    },
                )

            page.unroute("**/auth/verify-email**")
            page.route("**/auth/verify-email**", mock_verify_invalid)
            page.goto(f"{BASE}/verify-email?token=token-da-dung", wait_until="load")
            page.wait_for_selector("[data-testid=verify-email-invalid]", timeout=10000)
            check("6. TOKEN_INVALID (token đã dùng) → màn link không hợp lệ", True)

            # ── 7. Mock 500 → màn lỗi + Thử lại → 200 → thành công ────
            def mock_verify_500(route):
                route.fulfill(
                    status=500,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "Internal server error",
                    },
                )

            page.unroute("**/auth/verify-email**")
            page.route("**/auth/verify-email**", mock_verify_500)
            page.goto(f"{BASE}/verify-email?token=token-loi-500", wait_until="load")
            page.wait_for_selector("[data-testid=verify-email-error]", timeout=10000)
            check("7a. 5xx → màn lỗi + nút Thử lại", True)
            page.unroute("**/auth/verify-email**")
            page.route("**/auth/verify-email**", mock_verify_200)
            page.click("button:has-text('Thử lại')")
            page.wait_for_selector("[data-testid=verify-email-success]", timeout=10000)
            check("7b. Nhấn Thử lại (mock 200) → màn thành công", True)

            # ── 8. Không console error bất thường ─────────────────────
            # 400/422/500 là lỗi nghiệp vụ do test cố tình mock;
            # 404 "Failed to load resource" từ AuthShell slideshow dò ảnh minh họa
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
            check("8. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-verify-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
