"""
Test E2E cho Bước 7.3 — trang /auth/callback (Google OAuth2 callback) + nút Google trên /login.

Chạy: python3 scripts/test-step7-3-google-callback-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy, identity-service
ĐÃ cấu hình GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET + allowlist (2026-10-21).
Không đụng DB — đường đi thành công (đổi code thật) cần Test user trong
Google Cloud Console (OAuth consent screen) — việc thủ công ngoài script.

Bao phủ:
- /login hiển thị nút Google khi feature.social_login.enabled=true
- Click nút → sinh + lưu state vào sessionStorage; BE trả URL Google THẬT
  (client_id, redirect_uri allowlist, scope openid...) → điều hướng sang
  accounts.google.com — tích hợp FE↔BE thật
- Callback không tham số / state không khớp / user hủy → màn lỗi đúng thông điệp
- State khớp + code giả → gọi POST /auth/google (BE đổi code với Google thật →
  invalid_grant → lỗi hiển thị inline), state bị xóa sau 1 lần dùng
- Nút "Về trang đăng nhập" điều hướng đúng
- Link mode (state link:... từ SocialPanel): mock link 200 → /settings/security;
  link lỗi → màn linkError + nút "Về cài đặt bảo mật"
"""
import sys
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
STATE_KEY = "ppe.oauth.state"

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

        # ── 1. /login hiển thị nút Google (flag bật, render sau hydrate) ──
        page.goto(f"{BASE}/login", wait_until="load")
        page.wait_for_timeout(1500)
        btn = page.locator("button", has_text="Đăng nhập bằng Google")
        check("1. /login hiển thị nút Google", btn.count() == 1)

        # ── 2. Click nút → sinh state + BE trả URL Google THẬT → điều hướng ──
        #        BE đã cấu hình Google (2026-10-21) → GET /auth/google/url trả
        #        URL accounts.google.com thật với client_id + allowlist redirect.
        btn.click()
        page.wait_for_url("**accounts.google.com**", timeout=15000)
        qs = parse_qs(urlparse(page.url).query)
        check("2a. Điều hướng sang accounts.google.com", "accounts.google.com" in page.url, page.url[:80])
        check(
            "2b. URL Google đúng client_id + response_type=code + scope openid",
            qs.get("client_id", [""])[0].startswith("114349094880")
            and qs.get("response_type", [""])[0] == "code"
            and "openid" in qs.get("scope", [""])[0],
            qs.get("client_id", [""])[0][:40],
        )
        check(
            "2c. redirect_uri = http://localhost:3000/auth/callback (allowlist BE)",
            qs.get("redirect_uri", [""])[0] == "http://localhost:3000/auth/callback",
            qs.get("redirect_uri", [""])[0],
        )
        check(
            "2d. URL Google có tham số state (UUID client sinh)",
            bool(qs.get("state", [""])[0]),
            qs.get("state", [""])[0][:20],
        )
        # Về lại origin localhost để đọc sessionStorage (giữ theo tab + origin)
        page.goto(f"{BASE}/login", wait_until="load")
        page.wait_for_timeout(800)
        saved_state = page.evaluate(f"sessionStorage.getItem('{STATE_KEY}')")
        check("2e. State đã lưu trong sessionStorage", bool(saved_state), str(saved_state)[:20])
        check("2f. State lưu == state trên URL Google", saved_state == qs.get("state", [""])[0])

        # ── 3. Callback không tham số → lỗi chung + nút về login ──────────
        page.evaluate("sessionStorage.clear()")
        page.goto(f"{BASE}/auth/callback", wait_until="load")
        page.wait_for_timeout(800)
        body = page.inner_text("body")
        check(
            "3. Callback không tham số → lỗi chung",
            "Đã xảy ra lỗi trong quá trình đăng nhập bằng Google" in body,
        )
        check("3b. Có nút về trang đăng nhập", "Về trang đăng nhập" in body)

        # ── 4. User từ chối trên màn hình Google → thông báo hủy ──────────
        page.goto(f"{BASE}/auth/callback?error=access_denied", wait_until="load")
        page.wait_for_timeout(800)
        check("4. error=access_denied → thông báo hủy", "đã hủy đăng nhập" in page.inner_text("body"))

        # ── 5. State không khớp bản đã lưu → nghi CSRF → lỗi chung ────────
        page.goto(f"{BASE}/auth/callback?code=fake-code&state=wrong-state", wait_until="load")
        page.wait_for_timeout(800)
        check(
            "5. State không khớp (CSRF) → lỗi chung",
            "Đã xảy ra lỗi trong quá trình đăng nhập bằng Google" in page.inner_text("body"),
        )

        # ── 6. State khớp + code giả → gọi POST /auth/google ───────────────
        #        BE đã cấu hình Google: đổi code giả với Google thật →
        #        invalid_grant → lỗi hiển thị inline (không pin message vì
        #        message phụ thuộc cách BE map lỗi từ Google).
        page.goto(f"{BASE}/login", wait_until="load")
        page.evaluate(f"sessionStorage.setItem('{STATE_KEY}', 'e2e-state-123')")
        page.goto(f"{BASE}/auth/callback?code=e2e-fake-code&state=e2e-state-123", wait_until="load")
        page.wait_for_timeout(6000)
        check("6a. State khớp → gọi API đổi code, hiển thị lỗi inline", page.locator("main [role=alert]").count() == 1)
        check(
            "6b. State bị xóa sau 1 lần dùng (chống replay)",
            page.evaluate(f"sessionStorage.getItem('{STATE_KEY}')") is None,
        )

        # ── 7. Nút về login điều hướng đúng ───────────────────────────────
        page.locator("button", has_text="Về trang đăng nhập").click()
        page.wait_for_url("**/login")
        check("7. Nút về login điều hướng đúng", "/login" in page.url)

        # ── 8. Link mode: state link:... + mock link 200 → về settings ────
        #        (mock /auth/me + /auth/social để (auth) guard cho qua trang settings)
        def mock_me(route):
            route.fulfill(
                status=200,
                content_type="application/json",
                json={
                    "success": True,
                    "data": {
                        "id": "u-admin", "email": "admin@ppe.local", "fullName": "Admin",
                        "avatarUrl": None, "phoneNumber": None, "role": "ADMIN", "roleId": "r1",
                        "permissions": ["*"], "isActive": True, "twoFactorEnabled": False,
                        "createdAt": "2026-01-01T00:00:00.000Z",
                    },
                },
            )

        def mock_social_empty(route):
            route.fulfill(
                status=200,
                content_type="application/json",
                json={"success": True, "data": []},
            )

        def mock_sessions_empty(route):
            route.fulfill(
                status=200,
                content_type="application/json",
                json={"success": True, "data": []},
            )

        link_payload = {}

        def mock_link_ok(route):
            link_payload["body"] = route.request.post_data or ""
            route.fulfill(
                status=200,
                content_type="application/json",
                json={"success": True, "message": "Liên kết thành công"},
            )

        page.route("**/auth/me", mock_me)
        page.route("**/auth/social", mock_social_empty)
        page.route("**/auth/sessions", mock_sessions_empty)
        page.route("**/auth/social/link", mock_link_ok)
        # Cookie giả: proxy LỚP 1 chỉ check sự hiện diện cookie — cần để RSC
        # fetch /settings/security (protected) không bị 307 đá về /login.
        # (Không goto /login khi có cookie — proxy public-auth sẽ đá về "/".)
        context.add_cookies([
            {"name": "accessToken", "value": "e2e-access-token",
             "domain": "localhost", "path": "/"},
            {"name": "refreshToken", "value": "e2e-refresh-token",
             "domain": "localhost", "path": "/"},
        ])
        page.goto(f"{BASE}/auth/callback", wait_until="load")
        page.evaluate(f"sessionStorage.setItem('{STATE_KEY}', 'link:e2e-link-1')")
        page.goto(f"{BASE}/auth/callback?code=e2e-link-code&state=link:e2e-link-1", wait_until="load")
        page.wait_for_url("**/settings/security", timeout=15000)
        check("8a. State link:... + mock link 200 → chuyển /settings/security",
              "/settings/security" in page.url, page.url)
        check("8b. Payload link gửi đúng provider GOOGLE + code",
              '"provider":"GOOGLE"' in link_payload.get("body", "")
              and "e2e-link-code" in link_payload.get("body", ""),
              link_payload.get("body", "")[:120])
        check("8c. State bị xóa sau 1 lần dùng",
              page.evaluate(f"sessionStorage.getItem('{STATE_KEY}')") is None)

        # ── 9. Link mode lỗi → màn linkError + nút Về cài đặt bảo mật ─────
        def mock_link_error(route):
            route.fulfill(
                status=400,
                content_type="application/json",
                json={
                    "success": False,
                    "code": "DUPLICATE_ENTRY",
                    "message": "Tài khoản Google này đã được liên kết với người dùng khác",
                },
            )

        page.unroute("**/auth/social/link")
        page.route("**/auth/social/link", mock_link_error)
        page.evaluate(f"sessionStorage.setItem('{STATE_KEY}', 'link:e2e-link-2')")
        page.goto(f"{BASE}/auth/callback?code=e2e-link-code&state=link:e2e-link-2", wait_until="load")
        page.wait_for_selector("main [role=alert]", timeout=10000)
        check("9a. Link lỗi → hiển thị message BE inline",
              page.locator("main [role=alert]").count() == 1)
        check("9b. Có nút Về cài đặt bảo mật (không phải về login)",
              page.locator("button", has_text="Về cài đặt bảo mật").count() == 1)
        page.locator("button", has_text="Về cài đặt bảo mật").click()
        page.wait_for_url("**/settings/security", timeout=15000)
        check("9c. Nút Về cài đặt bảo mật → /settings/security", "/settings/security" in page.url, page.url)
        page.unroute("**/auth/social/link")
        page.unroute("**/auth/me")
        page.unroute("**/auth/social")
        page.unroute("**/auth/sessions")

        # ── 10. Không console error bất thường ─────────────────────────────
        # 401 "Failed to load resource" đến từ AuthProvider gọi GET /auth/me
        # khôi phục session khi chưa có cookie — hành vi có chủ đích.
        real_errors = [
            e for e in console_errors
            if "favicon" not in e.lower()
            and "401" not in e
            and "Unauthorized" not in e
            and "400" not in e  # mock_link_error bước 9 cố ý
            and "Bad Request" not in e
            and "status of 404" not in e
            and "status of 500" not in e  # lỗi BE cố ý khi đổi code giả (invalid_grant...)
        ]
        check("10. Không console error bất thường", len(real_errors) == 0, "; ".join(real_errors[:3]) if real_errors else "")

        browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
