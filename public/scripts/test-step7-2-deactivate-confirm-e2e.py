"""
Test E2E cho Bước 7.2 — trang xác nhận vô hiệu hóa tài khoản /verify-email/deactivate.

Chạy: python3 scripts/test-step7-2-deactivate-confirm-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- KHÔNG gửi token hợp lệ lên BE thật (sẽ vô hiệu hóa admin thật) — nhánh
  thành công dùng mock 200; token rác lên BE thật → 400 TOKEN_INVALID (an toàn).
- Link email: `${APP_URL}/verify-email/deactivate?token=...` (notification-service).
- Trang nằm trong nhóm (public) nhưng user ĐANG đăng nhập khi bấm link email —
  proxy.ts + (public) layout có ngoại lệ không đá về "/" (test bước 7).

Bao phủ:
- Thiếu token → màn liên kết không hợp lệ
- Token rác → 400 TOKEN_INVALID (BE thật) → màn liên kết không hợp lệ
- Confirm chỉ gửi đúng 1 request (guard StrictMode double-fire)
- Mock 400 TOKEN_EXPIRED → màn liên kết không hợp lệ
- Mock 500 → màn lỗi + nút Thử lại → mock 200 → màn "tạm biệt" → về /login
- Đang đăng nhập bấm link email → không bị guard đá về "/"
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


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Thiếu token → màn liên kết không hợp lệ ────────────────
            page.goto(f"{BASE}/verify-email/deactivate", wait_until="load")
            page.wait_for_selector("[data-testid=deactivate-confirm-invalid]", timeout=10000)
            invalid_text = page.locator("[data-testid=deactivate-confirm-invalid]").inner_text()
            check("1a. Thiếu token → màn Liên kết không hợp lệ",
                  "Liên kết không hợp lệ" in invalid_text, invalid_text[:80])
            check("1b. Có nút về trang đăng nhập",
                  page.locator("[data-testid=deactivate-confirm-invalid] button:has-text('Về trang đăng nhập')").count() > 0)
            page.screenshot(path="/tmp/ppe-deactivate-invalid-link.png", full_page=True)

            # ── 2. Token rác → BE thật 400 TOKEN_INVALID ──────────────────
            confirm_calls = []

            def count_confirm(route):
                confirm_calls.append(route.request.post_data or "")
                route.continue_()

            page.route("**/auth/deactivate/confirm", count_confirm)
            page.goto(f"{BASE}/verify-email/deactivate?token=token-rac-e2e", wait_until="load")
            page.wait_for_selector("[data-testid=deactivate-confirm-invalid]", timeout=15000)
            check("2a. Token rác → 400 TOKEN_INVALID (BE thật) → màn liên kết không hợp lệ", True)
            page.wait_for_timeout(500)
            check("2b. Confirm chỉ gửi đúng 1 request (chống StrictMode double-fire)",
                  len(confirm_calls) == 1, f"{len(confirm_calls)} request(s)")
            page.unroute("**/auth/deactivate/confirm")

            # ── 3. Mock 400 TOKEN_EXPIRED → màn liên kết không hợp lệ ─────
            def mock_expired(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TOKEN_EXPIRED",
                        "message": "Token xác nhận đã hết hạn",
                    },
                )

            page.route("**/auth/deactivate/confirm", mock_expired)
            page.goto(f"{BASE}/verify-email/deactivate?token=het-han", wait_until="load")
            page.wait_for_selector("[data-testid=deactivate-confirm-invalid]", timeout=10000)
            check("3. TOKEN_EXPIRED (mock) → màn liên kết không hợp lệ", True)
            page.unroute("**/auth/deactivate/confirm")

            # ── 4. Mock 500 → màn lỗi → Thử lại → mock 200 → tạm biệt ────
            def mock_500(route):
                route.fulfill(
                    status=500,
                    content_type="application/json",
                    json={"success": False, "code": "INTERNAL_SERVER_ERROR", "message": "Lỗi máy chủ"},
                )

            page.route("**/auth/deactivate/confirm", mock_500)
            page.goto(f"{BASE}/verify-email/deactivate?token=loi-500", wait_until="load")
            page.wait_for_selector("[data-testid=deactivate-confirm-error]", timeout=10000)
            check("4a. 500 (mock) → màn lỗi + nút Thử lại",
                  page.locator("[data-testid=deactivate-confirm-error] button:has-text('Thử lại')").count() > 0)
            page.unroute("**/auth/deactivate/confirm")

            def mock_200(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "message": "Tài khoản đã được vô hiệu hóa thành công"},
                )

            page.route("**/auth/deactivate/confirm", mock_200)
            page.click("[data-testid=deactivate-confirm-error] button:has-text('Thử lại')")
            page.wait_for_selector("[data-testid=deactivate-confirm-success]", timeout=10000)
            success_text = page.locator("[data-testid=deactivate-confirm-success]").inner_text()
            check("4b. Thử lại (mock 200) → màn tạm biệt 'Tài khoản đã được vô hiệu hóa'",
                  "Tài khoản đã được vô hiệu hóa" in success_text, success_text[:80])
            page.screenshot(path="/tmp/ppe-deactivate-success.png", full_page=True)
            page.click("[data-testid=deactivate-confirm-success] button:has-text('Về trang đăng nhập')")
            page.wait_for_url("**/login", timeout=10000)
            check("4c. Nút về trang đăng nhập → /login", "/login" in page.url, page.url)
            page.unroute("**/auth/deactivate/confirm")

            # ── 5. Đang đăng nhập bấm link email → KHÔNG bị guard đá ─────
            page.goto(f"{BASE}/login", wait_until="load")
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url("**/dashboard", timeout=20000)

            page.route("**/auth/deactivate/confirm", mock_200)
            page.goto(f"{BASE}/verify-email/deactivate?token=dang-nhap", wait_until="load")
            page.wait_for_selector("[data-testid=deactivate-confirm-success]", timeout=10000)
            still_here = "/verify-email/deactivate" in page.url
            check("5. User đang đăng nhập mở link email → không bị bounce về / (proxy + layout)",
                  still_here, page.url)
            page.unroute("**/auth/deactivate/confirm")

            # ── 6. Không console error bất thường ─────────────────────────
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "400" not in e and "Bad Request" not in e
                and "401" not in e and "Unauthorized" not in e
                and "500" not in e and "Internal Server Error" not in e
                and "status of 404" not in e
                and "stream-ticket" not in e
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
                page.screenshot(path="/tmp/ppe-deactivate-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
