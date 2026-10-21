"""
Test E2E cho Bước 7.2 — trang /settings/security (5 tab: 2FA, Sessions, Social, Password, Deactivate).

Chạy: python3 scripts/test-step7-2-settings-security-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

Lưu ý môi trường:
- Đăng nhập admin thật (2FA đang TẮT) → tab 2FA hiện trạng thái "chưa bật".
- KHÔNG bật 2FA thật cho admin — luồng setup/enable/regenerate/disable đều mock.
- GET /auth/sessions, /auth/social là read-only → gọi BE thật để test render dữ liệu thật.
- Nhánh "2FA đã bật" (regenerate/disable form) test bằng mock /auth/me sau reload.
- KHÔNG gửi request deactivate với mật khẩu ĐÚNG (BE sẽ gửi email thật).

Bao phủ:
- Render 5 tab + mặc định tab 2FA + trạng thái chưa bật (BE thật)
- Enable flow (mock): setup → QR → nhập code → modal backupCodes (confirm + download + done)
- Trạng thái đã bật (mock /auth/me): regenerate → modal; disable → trạng thái tắt
- Sessions: danh sách BE thật + badge phiên hiện tại; revoke (mock) + revoke all others (mock)
- Social: empty state + nút link Google (mock URL, abort navigation) + unlink inline confirm (mock 400 anti-lockout)
- Password: render form đổi mật khẩu (sai mật khẩu cũ → 401 BE thật)
- Deactivate: sai mật khẩu → 400 INVALID_CREDENTIALS (BE thật); mock 200 → màn check email
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


def goto_settings(page) -> None:
    page.goto(f"{BASE}/settings/security", wait_until="load")
    page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Đăng nhập → render trang + 5 tab ──────────────────────
            login(page)
            goto_settings(page)
            check("1a. Tiêu đề trang Cài đặt bảo mật",
                  page.locator("h1:has-text('Cài đặt bảo mật')").count() > 0)
            check("1b. Đủ 5 tab (2fa/sessions/social/password/deactivate)",
                  all(page.locator(f"[data-testid=security-tab-{t}]").count() == 1
                      for t in ["2fa", "sessions", "social", "password", "deactivate"]))
            check("1c. Mặc định hiển thị tab 2FA",
                  page.locator("[data-testid=two-factor-panel]").count() == 1)
            page.screenshot(path="/tmp/ppe-security-2fa-tab.png", full_page=True)

            # ── 2. Trạng thái 2FA từ BE thật (admin đang tắt) ─────────────
            page.wait_for_selector("text=Xác thực hai yếu tố đang tắt", timeout=10000)
            check("2. BE thật: 2FA chưa bật → card trạng thái + nút Bật",
                  page.locator("[data-testid=two-factor-panel] button:has-text('Bật xác thực')").count() > 0)

            # ── 3. Enable flow (mock setup) → QR hiển thị ─────────────────
            def mock_setup(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": {
                            "secret": "JBSWY3DPEHPK3PXP",
                            "otpauthUrl": "otpauth://totp/SmartPPE:admin@ppe.local?secret=JBSWY3DPEHPK3PXP&issuer=SmartPPE",
                        },
                    },
                )

            page.route("**/auth/2fa/setup", mock_setup)
            page.click("[data-testid=two-factor-panel] button:has-text('Bật xác thực')")
            page.wait_for_selector("[data-testid=two-factor-setup]", timeout=10000)
            check("3a. Bấm Bật → gọi setup (mock) → panel nhập mã hiện ra",
                  page.locator("[data-testid=two-factor-setup]").count() == 1)
            page.wait_for_selector("img[data-testid=two-factor-qr]", timeout=10000)
            check("3b. QR render từ otpauthUrl (qrcode lib)",
                  page.locator("img[data-testid=two-factor-qr]").count() == 1)
            check("3c. Secret hiển thị để nhập thủ công",
                  page.locator("[data-testid=two-factor-setup] code:has-text('JBSWY3DPEHPK3PXP')").count() > 0)
            page.screenshot(path="/tmp/ppe-security-2fa-qr.png", full_page=True)

            # ── 4. Enable (mock 200) → modal backupCodes 1 lần ────────────
            def mock_enable(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": {
                            "backupCodes": [
                                "ABCD-EFGH", "IJKL-MNOP", "QRST-UVWX", "YZ12-3456",
                                "7890-ABCD", "EFGH-IJKL", "MNOP-QRST", "UVWX-YZ12",
                            ]
                        },
                    },
                )

            page.route("**/auth/2fa/enable", mock_enable)
            page.fill("#twoFactorSetupCode", "123456")
            page.click("[data-testid=two-factor-setup] button[type=submit]")
            page.wait_for_selector("[data-testid=backup-codes-modal]", timeout=10000)
            check("4a. Enable thành công → modal 8 mã dự phòng",
                  page.locator("[data-testid=backup-codes-modal] code").count() == 8)
            check("4b. Nút Hoàn tất bị khóa khi chưa xác nhận 'đã lưu'",
                  page.locator("[data-testid=backup-codes-modal] button:has-text('Hoàn tất')").is_disabled())
            check("4c. Có nút tải .txt",
                  page.locator("[data-testid=backup-codes-modal] button:has-text('Tải xuống')").count() == 1)
            page.screenshot(path="/tmp/ppe-security-backup-codes.png", full_page=True)
            page.check("[data-testid=backup-codes-confirm]")
            page.wait_for_timeout(200)
            check("4d. Xác nhận đã lưu → nút Hoàn tất mở khóa",
                  not page.locator("[data-testid=backup-codes-modal] button:has-text('Hoàn tất')").is_disabled())
            page.click("[data-testid=backup-codes-modal] button:has-text('Hoàn tất')")
            page.wait_for_selector("[data-testid=backup-codes-modal]", state="detached", timeout=5000)
            check("4e. Hoàn tất → modal đóng", True)
            page.unroute("**/auth/2fa/setup")
            page.unroute("**/auth/2fa/enable")

            # ── 5. Trạng thái "đã bật" (mock /auth/me sau reload) ────────
            def mock_me_enabled(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": {
                            "id": "u-admin",
                            "email": EMAIL,
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

            page.route("**/auth/me", mock_me_enabled)
            page.reload(wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)
            page.wait_for_selector("text=đang được bật", timeout=10000)
            check("5a. Mock me twoFactorEnabled: true → card Đã bật + nút tạo lại/tắt",
                  page.locator("[data-testid=two-factor-panel] button:has-text('Tạo lại mã dự phòng')").count() > 0
                  and page.locator("[data-testid=two-factor-panel] button:has-text('Tắt xác thực')").count() > 0)

            # ── 6. Tạo lại mã dự phòng (mock) ─────────────────────────────
            def mock_regenerate(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": {"backupCodes": ["NEW1-CODE", "NEW2-CODE", "NEW3-CODE", "NEW4-CODE",
                                                 "NEW5-CODE", "NEW6-CODE", "NEW7-CODE", "NEW8-CODE"]},
                    },
                )

            page.route("**/auth/2fa/backup-codes/regenerate", mock_regenerate)
            page.click("[data-testid=two-factor-panel] button:has-text('Tạo lại mã dự phòng')")
            page.wait_for_selector("#regenerateCode", timeout=5000)
            page.fill("#regenerateCode", "123456")
            page.fill("#regeneratePassword", PASSWORD)
            page.click("form:has(#regenerateCode) button[type=submit]")
            page.wait_for_selector("[data-testid=backup-codes-modal]", timeout=10000)
            check("6. Tạo lại thành công (mock) → modal mã mới hiển thị",
                  page.locator("[data-testid=backup-codes-modal] code").count() == 8)
            page.check("[data-testid=backup-codes-confirm]")
            page.click("[data-testid=backup-codes-modal] button:has-text('Hoàn tất')")
            page.wait_for_selector("[data-testid=backup-codes-modal]", state="detached", timeout=5000)
            page.unroute("**/auth/2fa/backup-codes/regenerate")

            # ── 7. Tắt 2FA (mock 200) → trạng thái tắt ────────────────────
            def mock_disable(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "message": "Đã tắt xác thực hai yếu tố"},
                )

            page.route("**/auth/2fa/disable", mock_disable)
            page.click("[data-testid=two-factor-panel] button:has-text('Tắt xác thực')")
            page.wait_for_selector("#disableCode", timeout=5000)
            page.fill("#disableCode", "ABCD-EFGH")
            page.fill("#disablePassword", PASSWORD)
            page.click("form:has(#disableCode) button[type=submit]")
            # Hook set twoFactorEnabled: false trong AuthContext (mock me vẫn true —
            # invalidate me refetch lại mock trả true) → chỉ assert form tắt đã đóng
            page.wait_for_selector("#disableCode", state="detached", timeout=10000)
            check("7. Tắt 2FA (mock) → form tắt đóng lại", True)
            page.unroute("**/auth/2fa/disable")
            page.unroute("**/auth/me")
            page.reload(wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)

            # ── 8. Tab Sessions — danh sách BE thật ───────────────────────
            page.click("[data-testid=security-tab-sessions]")
            page.wait_for_selector("[data-testid=sessions-panel]", timeout=10000)
            check("8a. Phiên hiện tại có badge (dữ liệu BE thật)",
                  page.locator("[data-testid=session-item-current]").count() == 1
                  and page.locator("[data-testid=session-current-badge]").count() == 1)
            # Admin dev đã login nhiều lần → BE thật có nhiều phiên; assert
            # nút "thu hồi tất cả" nhất quán với số phiên KHÁC phiên hiện tại
            non_current = page.locator("[data-testid=session-item]").count()
            has_revoke_all = page.locator(
                "[data-testid=sessions-panel] button:has-text('Thu hồi tất cả thiết bị khác')"
            ).count() > 0
            check("8b. Nút 'thu hồi tất cả' nhất quán với số phiên khác (BE thật)",
                  (non_current > 0) == has_revoke_all,
                  f"{non_current} phiên khác → nút {'có' if has_revoke_all else 'không'}")
            page.screenshot(path="/tmp/ppe-security-sessions.png", full_page=True)

            # ── 9. Sessions — revoke phiên khác (mock 2 phiên) ────────────
            sessions_two = [
                {"id": "s1", "deviceName": "Chrome — MacBook", "ipAddress": "127.0.0.1",
                 "createdAt": "2026-10-21T08:00:00.000Z", "isCurrent": False},
                {"id": "s2", "deviceName": "Chrome — Test (hiện tại)", "ipAddress": "127.0.0.1",
                 "createdAt": "2026-10-21T08:05:00.000Z", "isCurrent": True},
            ]

            def mock_sessions(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "data": sessions_two},
                )

            # Sessions query có staleTime 60s — reload để query fresh gọi mock
            page.route("**/auth/sessions", mock_sessions)
            page.reload(wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)
            page.click("[data-testid=security-tab-sessions]")
            page.wait_for_selector("[data-testid=session-item]", timeout=10000)
            check("9a. Mock 2 phiên → hiện 2 dòng + nút thu hồi tất cả",
                  page.locator("[data-testid=session-item]").count() == 1
                  and page.locator("[data-testid=session-item-current]").count() == 1
                  and page.locator("button:has-text('Thu hồi tất cả thiết bị khác')").count() > 0)

            revoke_called = {}

            def mock_revoke(route):
                revoke_called["url"] = route.request.url
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "message": "Đã thu hồi phiên đăng nhập"},
                )

            page.route("**/auth/sessions/*", mock_revoke)
            page.click("[data-testid=session-item] button:has-text('Thu hồi')")
            page.wait_for_timeout(200)
            check("9b. Bấm Thu hồi lần 1 → nút đổi thành xác nhận",
                  page.locator("[data-testid=session-item] button:has-text('Xác nhận')").count() > 0)
            page.click("[data-testid=session-item] button:has-text('Xác nhận')")
            page.wait_for_timeout(1500)
            check("9c. Xác nhận → gọi DELETE /auth/sessions/:id",
                  "/auth/sessions/s1" in revoke_called.get("url", ""), revoke_called.get("url", ""))
            page.unroute("**/auth/sessions/*")

            # ── 10. Revoke tất cả thiết bị khác (mock) ────────────────────
            revoke_all_called = {}

            def mock_sessions_with_delete(route):
                if route.request.method == "DELETE":
                    revoke_all_called["method"] = "DELETE"
                    revoke_all_called["url"] = route.request.url
                    route.fulfill(status=200, content_type="application/json",
                                  json={"success": True, "message": "Đã thu hồi tất cả phiên khác"})
                else:
                    route.fulfill(status=200, content_type="application/json",
                                  json={"success": True, "data": sessions_two})

            page.unroute("**/auth/sessions")
            page.route("**/auth/sessions", mock_sessions_with_delete)
            page.click("button:has-text('Thu hồi tất cả thiết bị khác')")
            page.wait_for_timeout(200)
            page.click("button:has-text('Xác nhận thu hồi')")
            page.wait_for_timeout(1500)
            check("10. Thu hồi tất cả (2 lần bấm) → gọi DELETE /auth/sessions",
                  revoke_all_called.get("method") == "DELETE"
                  and revoke_all_called.get("url", "").rstrip("/").endswith("/auth/sessions"),
                  revoke_all_called.get("url", ""))
            page.unroute("**/auth/sessions")

            # ── 11. Tab Social — empty state + nút link Google ───────────
            page.click("[data-testid=security-tab-social]")
            page.wait_for_selector("[data-testid=social-panel]", timeout=10000)
            check("11a. Social: danh sách BE thật (admin chưa link → empty hoặc list)",
                  page.locator("[data-testid=social-panel]").count() == 1)
            check("11b. Cảnh báo anti-lockout hiển thị",
                  page.locator("text=phương thức đăng nhập cuối cùng").count() > 0)
            # Admin có thể đã link Google từ test trước → chỉ assert nút khi chưa link
            has_google_item = page.locator("[data-testid=social-item-google]").count() > 0
            if not has_google_item:
                # Mock GET /auth/google/url + abort navigation tới Google thật
                def mock_google_url(route):
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        json={"success": True, "data": {"url": "https://accounts.google.com/o/oauth2/auth?e2e=1"}},
                    )

                page.route("**/auth/google/url*", mock_google_url)
                page.route("https://accounts.google.com/**", lambda r: r.abort())
                page.click("button:has-text('Liên kết tài khoản Google')")
                page.wait_for_timeout(1500)
                # assign sang Google đã bị abort (trang lỗi) — quay về cùng origin
                # đọc sessionStorage (state giữ nguyên theo tab + origin)
                page.goto(f"{BASE}/settings/security", wait_until="load")
                page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)
                state = page.evaluate("sessionStorage.getItem('ppe.oauth.state')")
                check("11c. Bấm Liên kết Google → sinh state link:... (chống CSRF)",
                      isinstance(state, str) and state.startswith("link:"), str(state)[:40])
                page.unroute("**/auth/google/url*")
            else:
                check("11c. (skip) Admin đã link Google — bỏ qua nhánh nút liên kết", True,
                      "đã có social-item-google")
            page.screenshot(path="/tmp/ppe-security-social.png", full_page=True)

            # ── 12. Unlink inline confirm + anti-lockout (mock) ───────────
            def mock_social_list(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={
                        "success": True,
                        "data": [
                            {"id": "sa1", "provider": "GOOGLE", "providerUserId": "g-123",
                             "createdAt": "2026-10-01T08:00:00.000Z"},
                        ]
                    },
                )

            page.route("**/auth/social", mock_social_list)
            # Social query cũng staleTime 60s — reload để query fresh gọi mock
            page.reload(wait_until="load")
            page.wait_for_selector("[data-testid=two-factor-panel]", timeout=15000)
            page.click("[data-testid=security-tab-social]")
            page.wait_for_selector("[data-testid=social-item-google]", timeout=10000)
            check("12a. Mock danh sách → hiện Google đã liên kết + ngày liên kết",
                  page.locator("[data-testid=social-item-google]").count() == 1)

            def mock_unlink_lockout(route):
                route.fulfill(
                    status=400,
                    content_type="application/json",
                    json={
                        "success": False,
                        "code": "BAD_REQUEST",
                        "message": "Không thể hủy liên kết phương thức đăng nhập duy nhất",
                    },
                )

            page.route("**/auth/social/GOOGLE", mock_unlink_lockout)
            page.click("[data-testid=social-item-google] button:has-text('Hủy liên kết')")
            page.wait_for_timeout(200)
            check("12b. Bấm Hủy liên kết lần 1 → nút đổi thành xác nhận",
                  page.locator("[data-testid=social-item-google] button:has-text('Xác nhận')").count() > 0)
            page.click("[data-testid=social-item-google] button:has-text('Xác nhận')")
            page.wait_for_selector("text=Không thể hủy liên kết phương thức đăng nhập duy nhất", timeout=10000)
            check("12c. 400 anti-lockout (mock) → cảnh báo inline", True)
            page.unroute("**/auth/social/GOOGLE")
            page.unroute("**/auth/social")
            page.screenshot(path="/tmp/ppe-security-social-unlink.png", full_page=True)

            # ── 13. Tab Password — form đổi mật khẩu + 401 BE thật ───────
            page.click("[data-testid=security-tab-password]")
            page.wait_for_selector('input[autocomplete="current-password"]', timeout=10000)
            check("13a. Tab Password render form đổi mật khẩu + checklist",
                  page.locator('input[autocomplete="new-password"]').count() == 1
                  and page.locator("ul li").count() == 5)
            page.fill('input[autocomplete="current-password"]', "SaiMatKhau1!")
            page.fill('input[autocomplete="new-password"]', "NewPass1!")
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=15000)
            check("13b. Sai mật khẩu cũ (BE thật) → banner lỗi", True)

            # ── 14. Tab Deactivate — sai mật khẩu (BE thật) ───────────────
            page.click("[data-testid=security-tab-deactivate]")
            page.wait_for_selector("[data-testid=deactivate-panel]", timeout=10000)
            check("14a. Panel vô hiệu hóa có cảnh báo + form mật khẩu + lý do",
                  page.locator("#deactivatePassword").count() == 1
                  and page.locator("#deactivateReason").count() == 1)
            page.fill("#deactivatePassword", "SaiMatKhau1!")
            page.fill("#deactivateReason", "Test E2E — không gửi thật")
            page.click("[data-testid=deactivate-panel] button[type=submit]")
            page.wait_for_selector("[data-testid=deactivate-panel] [role=alert]", timeout=15000)
            check("14b. Sai mật khẩu (BE thật 400 INVALID_CREDENTIALS) → banner",
                  page.locator("[data-testid=deactivate-panel] [role=alert]").count() > 0)
            page.screenshot(path="/tmp/ppe-security-deactivate.png", full_page=True)

            # ── 15. Deactivate mock 200 → màn check email ─────────────────
            def mock_request_ok(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    json={"success": True, "message": "Vui lòng kiểm tra email để xác nhận"},
                )

            page.route("**/auth/deactivate/request", mock_request_ok)
            page.fill("#deactivatePassword", "SaiMatKhau1!")
            page.click("[data-testid=deactivate-panel] button[type=submit]")
            page.wait_for_selector("[data-testid=deactivate-requested]", timeout=10000)
            check("15. Gửi yêu cầu (mock 200) → màn hướng dẫn kiểm tra email",
                  page.locator("[data-testid=deactivate-requested]").count() == 1)
            page.unroute("**/auth/deactivate/request")

            # ── 16. Không console error bất thường ────────────────────────
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "401" not in e and "Unauthorized" not in e
                and "400" not in e and "Bad Request" not in e
                and "404" not in e and "Not Found" not in e
                and "status of 404" not in e
                and "status of 500" not in e  # stream-ticket notifications (hạ tầng BE)
                and "Internal Server Error" not in e
                and "stream-ticket" not in e
                and "net::ERR_FAILED" not in e  # abort navigation Google thật ở bước 11
                and "font-size:0;color:transparent" not in e
                and "Connecting to 'data:,'" not in e
                and "cannot load data:," not in e
            ]
            check("16. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-security-debug.png", full_page=True)
            except Exception:
                pass
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
