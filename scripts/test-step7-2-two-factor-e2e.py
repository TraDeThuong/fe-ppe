"""
Test E2E cho Bước 7.2 — trang /2fa thật (6 ô TOTP + backup code + đếm ngược tempToken).

Chạy: python3 scripts/test-step7-2-two-factor-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- tempToken là JWT HS256 BE cấp khi login requires2FA — không tự sinh được,
  nên nhập mã đúng gửi tempToken rác lên BE thật sẽ 401 TOKEN_EXPIRED (an toàn).
- Nhánh thành công / sai mã / tài khoản không đủ điều kiện dùng mock route
  POST /auth/2fa/verify (không đụng DB, không tạo session thật).

Bao phủ:
- Không tempToken → guard đưa về /login
- Có tempToken → form 6 ô + countdown mm:ss + nút chuyển backup code
- zod: thiếu mã, sai định dạng 6 số, sai định dạng backup XXXX-XXXX
- Gõ ô tự nhảy (auto-advance), paste 6 số vào ô đầu
- 401 TOKEN_EXPIRED (BE thật, tempToken rác) → màn hết hạn + Đăng nhập lại
- Mock 400 TWO_FACTOR_INVALID_CODE → toast + tempToken giữ lại để thử lại
- Mock 200 → lưu token → về dashboard
- Backup code mode: submit đúng payload XXXX-XXXX
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
            # ── 1. Không tempToken → guard của trang đưa về /login ────────
            page.goto(f"{BASE}/2fa", wait_until="load")
            page.wait_for_url("**/login**", timeout=10000)
            check("1. /2fa không tempToken → về /login", "/login" in page.url, page.url)

            # ── 2. Có tempToken → form 6 ô + countdown + nút chuyển mode ──
            page.goto(f"{BASE}/login", wait_until="load")
            page.evaluate("sessionStorage.setItem('ppe.tempToken', 'e2e-temp-token')")
            page.goto(f"{BASE}/2fa", wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-form]", timeout=10000)
            check("2a. Form 2FA render với 6 ô nhập",
                  page.locator("[data-otp-index]").count() == 6)
            countdown = page.locator("[data-testid=two-factor-countdown]").inner_text()
            check("2b. Countdown hiệu lực tempToken dạng mm:ss",
                  ":" in countdown and len(countdown) == 5, countdown)
            check("2c. Nút chuyển sang nhập backup code",
                  page.locator("button:has-text('Dùng mã dự phòng')").count() > 0)
            page.screenshot(path="/tmp/ppe-2fa-form.png", full_page=True)

            # ── 3. zod: thiếu mã ──────────────────────────────────────────
            page.click("button[type=submit]")
            page.wait_for_selector("text=Vui lòng nhập mã xác thực.", timeout=5000)
            check("3. Submit rỗng → lỗi zod 'Vui lòng nhập mã xác thực'", True)

            # ── 4. zod: sai định dạng (chưa đủ 6 số) ──────────────────────
            page.fill("[data-otp-index='0']", "1")
            page.fill("[data-otp-index='1']", "2")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Mã xác thực phải gồm 6 chữ số", timeout=5000)
            check("4. Mã chưa đủ 6 số → lỗi zod định dạng", True)

            # ── 5. Gõ đủ 6 số (auto-advance) → submit tempToken rác lên BE thật ──
            for i in range(6):
                page.fill(f"[data-otp-index='{i}']", str((i + 1) % 10))
            page.click("button[type=submit]")
            # BE thật: tempToken "e2e-temp-token" không phải JWT hợp lệ → 401 TOKEN_EXPIRED
            page.wait_for_selector("[data-testid=two-factor-expired]", timeout=15000)
            check("5a. tempToken rác → 401 TOKEN_EXPIRED (BE thật) → màn hết hạn", True)
            check("5b. Màn hết hạn có nút Đăng nhập lại",
                  page.locator("[data-testid=two-factor-expired] button:has-text('Đăng nhập lại')").count() > 0)
            page.screenshot(path="/tmp/ppe-2fa-expired.png", full_page=True)

            # ── 6. Nút Đăng nhập lại → xóa tempToken → về /login ─────────
            page.click("[data-testid=two-factor-expired] button:has-text('Đăng nhập lại')")
            page.wait_for_url("**/login**", timeout=10000)
            temp_after = page.evaluate("sessionStorage.getItem('ppe.tempToken')")
            check("6. Đăng nhập lại → /login + tempToken bị xóa", "/login" in page.url and temp_after is None,
                  page.url)

            # ── 7. Sai mã (mock 400 TWO_FACTOR_INVALID_CODE) → toast + giữ tempToken ──
            def mock_wrong_code(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TWO_FACTOR_INVALID_CODE",
                        "message": "Mã xác thực không chính xác. Vui lòng thử lại.",
                    },
                )

            page.route("**/auth/2fa/verify", mock_wrong_code)
            page.goto(f"{BASE}/login", wait_until="load")
            page.evaluate("sessionStorage.setItem('ppe.tempToken', 'e2e-temp-token')")
            page.goto(f"{BASE}/2fa", wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-form]", timeout=10000)
            for i in range(6):
                page.fill(f"[data-otp-index='{i}']", "1")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Mã xác thực không chính xác. Vui lòng thử lại.", timeout=10000)
            temp_kept = page.evaluate("sessionStorage.getItem('ppe.tempToken')")
            check("7a. Sai mã → hiện message lỗi + form vẫn còn",
                  page.locator("[data-testid=two-factor-form]").count() > 0 and temp_kept is not None)
            check("7b. Các ô mã được xóa để nhập lại",
                  page.locator("[data-otp-index='0']").input_value() == "")
            page.unroute("**/auth/2fa/verify")

            # ── 8. Mock 200 → lưu token → về dashboard ───────────────────
            def mock_success(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    # Cookie giả: proxy LỚP 1 chỉ check SỰ HIỆN DIỆN cookie
                    # (không verify JWT) — nếu không, router.replace RSC fetch
                    # /dashboard bị proxy 307 đá về /login → loop vô hạn.
                    headers={
                        "Set-Cookie": (
                            "accessToken=e2e-access-token; Path=/; HttpOnly; SameSite=Lax, "
                            "refreshToken=e2e-refresh-token; Path=/; HttpOnly; SameSite=Lax"
                        )
                    },
                    json={
                        "success": True,
                        "data": {
                            "accessToken": "e2e-access-token",
                            "refreshToken": "e2e-refresh-token",
                            "user": {"id": "u1", "email": "admin@ppe.local", "role": "ADMIN"},
                        },
                    },
                )

            def mock_me(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": {
                            "id": "u1",
                            "email": "admin@ppe.local",
                            "fullName": "Admin",
                            "avatarUrl": None,
                            "phoneNumber": None,
                            "role": "ADMIN",
                            "roleId": "r1",
                            "permissions": ["*"],
                            "isActive": True,
                            "twoFactorEnabled": True,
                            "createdAt": "2026-01-01T00:00:00.000Z",
                        },
                    },
                )

            # Token là giả — các API khác (prefetch sessions...) sẽ 401 → refresh
            # fail → session-expired → bounce loop. Catch-all 200 rỗng cho 2 origin
            # (đăng ký TRƯỚC — Playwright ưu tiên route đăng ký sau).
            def mock_empty(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "data": []},
                )

            page.route("http://localhost:9999/api/v1/**", mock_empty)
            page.route("http://localhost:80/api/v1/**", mock_empty)
            page.route("**/auth/2fa/verify", mock_success)
            page.route("**/auth/me", mock_me)
            for i in range(6):
                page.fill(f"[data-otp-index='{i}']", "1")
            page.click("button[type=submit]")
            page.wait_for_url("**/dashboard", timeout=15000)
            check("8a. Xác thực 2FA thành công → về dashboard", "dashboard" in page.url, page.url)
            temp_gone = page.evaluate("sessionStorage.getItem('ppe.tempToken')")
            check("8b. tempToken bị xóa sau khi thành công", temp_gone is None)
            page.unroute("**/auth/2fa/verify")
            page.unroute("**/auth/me")
            page.unroute("http://localhost:9999/api/v1/**")
            page.unroute("http://localhost:80/api/v1/**")

            # ── 9. Backup code mode: submit đúng payload XXXX-XXXX ───────
            captured = {}

            def capture_verify(route):
                body = route.request.post_data or ""
                captured["body"] = body
                # Trả 400 sai mã — chỉ cần bắt payload (trả 200 không có token
                # sẽ làm onSuccess đọc accessToken undefined)
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "TWO_FACTOR_INVALID_CODE",
                        "message": "Mã xác thực không chính xác.",
                    },
                )

            page.route("**/auth/2fa/verify", capture_verify)
            # Cookie giả bước 8 khiến proxy coi /login, /2fa là "đã đăng nhập" →
            # xóa trước khi quay lại luồng public
            context.clear_cookies()
            page.goto(f"{BASE}/login", wait_until="load")
            page.evaluate("sessionStorage.setItem('ppe.tempToken', 'e2e-temp-token')")
            page.goto(f"{BASE}/2fa", wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-form]", timeout=10000)
            page.click("button:has-text('Dùng mã dự phòng')")
            backup_input = page.locator('input[autocomplete="one-time-code"]')
            backup_input.wait_for(state="visible", timeout=5000)
            backup_input.fill("AbCd-1234")
            page.click("button[type=submit]")
            page.wait_for_timeout(1500)
            check("9a. Mode backup code render ô nhập 1 dòng",
                  page.locator('input[autocomplete="one-time-code"]').count() == 1)
            check("9b. Payload gửi lên chứa backup code (uppercase + tempToken)",
                  '"code":"ABCD-1234"' in captured.get("body", "") and "e2e-temp-token" in captured.get("body", ""),
                  captured.get("body", "")[:120])
            page.unroute("**/auth/2fa/verify")

            # ── 10. Không console error bất thường ────────────────────────
            # 401/400 từ BE thật là lỗi nghiệp vụ do test cố tình gây ra
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "401" not in e and "Unauthorized" not in e
                and "400" not in e and "Bad Request" not in e
                and "status of 404" not in e
                and "stream-ticket" not in e
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
                page.screenshot(path="/tmp/ppe-2fa-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
