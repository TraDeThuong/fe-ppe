"""
Test E2E cho Bước 7.1 (Route guards 2 lớp) — trình duyệt thật (Playwright).

Chạy: python3 scripts/test-step7-1-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80) + identity-service,
DB đã seed (admin@ppe.local), Docker đang chạy (script tự flip
must_change_password của admin để test — có restore).

Bao phủ:
- Lớp 1 (proxy): protected redirect, public-auth redirect, /2fa trong luồng 2FA
- Lớp 2 ((auth) layout): mustChangePassword ép về /change-password
- Lớp 2 ((public) layout): điều hướng client-side đã login → redirect /
- Purge cookie khi session hết hạn → không còn bounce /login → / → /login
"""
import base64
import hashlib
import hmac
import json
import re
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@ppe.local"
PASSWORD = "Admin@123456"
# .env của identity-service (đọc secret để forge token hết hạn — như
# scripts/test-refresh-single-flight.ts của Bước 2)
IDENTITY_ENV = Path(__file__).resolve().parents[2] / "smart-ppe-identity-service" / ".env"

results = []


def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond))
    suffix = f" — {extra}" if extra else ""
    print(("  ✅ " if cond else "  ❌ ") + name + suffix)


def env_secret(key: str) -> str:
    text = IDENTITY_ENV.read_text()
    m = re.search(rf'^{key}="([^"]+)"', text, re.M)
    if not m:
        raise RuntimeError(f"Không tìm thấy {key} trong {IDENTITY_ENV}")
    return m.group(1)


def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def forge_expired(token: str, secret: str) -> str:
    """Bản sao token với iat/exp đã hết hạn, ký HS256 bằng secret BE.

    Backend dev sinh RSA keypair trong memory nên không forge được RS256,
    nhưng verify chấp nhận HS256 ký bằng JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
    (xem jwt-key.service.ts:279-285).
    """
    payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=" * (-len(token.split(".")[1]) % 4)))
    now = int(time.time())
    payload["iat"] = now - 120
    payload["exp"] = now - 60
    h = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    p = b64u(json.dumps(payload, separators=(",", ":")).encode())
    sig = b64u(hmac.new(secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())
    return f"{h}.{p}.{sig}"


def psql(sql: str) -> str:
    """Chạy SQL trên ppe_postgres (identity DB)."""
    out = subprocess.run(
        ["docker", "exec", "ppe_postgres", "psql", "-U", "postgres",
         "-d", "ppe_identity_db", "-tAc", sql],
        capture_output=True, text=True, timeout=30,
    )
    if out.returncode != 0:
        raise RuntimeError(f"psql fail: {out.stderr}")
    return out.stdout.strip()


def session_cookies(context) -> list[dict]:
    # Lưu ý: Playwright cấm cookie dict có cả `url` lẫn `path`/`domain`
    # (rewriteCookies assert) — dùng url thì domain/path được suy từ URL.
    return [
        {
            "name": c["name"],
            "value": c["value"],
            "url": BASE,
            "httpOnly": c.get("httpOnly", False),
            "secure": c.get("secure", False),
            "sameSite": c.get("sameSite", "Lax"),
        }
        for c in context.cookies(BASE)
        if c["name"] in ("accessToken", "refreshToken")
    ]


def has_session_cookies(context) -> bool:
    return len(session_cookies(context)) > 0


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

        # ── 1. Lớp 1: /dashboard không cookie → /login?next= ──────────────
        page.goto(f"{BASE}/dashboard", wait_until="load")
        check("1. /dashboard không cookie → /login?next=", "/login?next=%2Fdashboard" in page.url, page.url)

        # ── 2. /2fa giữa luồng 2FA: KHÔNG cookie nhưng CÓ tempToken → cho vào ──
        # (tempToken lưu sessionStorage — proxy không thấy; không được đá về /login)
        page.goto(f"{BASE}/login", wait_until="load")
        page.evaluate("sessionStorage.setItem('ppe.tempToken', 'e2e-temp-token')")
        page.goto(f"{BASE}/2fa", wait_until="load")
        page.wait_for_selector("[data-testid=two-factor-form]", timeout=10000)
        ok = "/2fa" in page.url and page.locator("[data-testid=two-factor-form]").count() > 0
        check("2. /2fa có tempToken (không cookie) → vào trang", ok, page.url)

        # ── 3. /2fa KHÔNG tempToken → guard của trang đưa về /login ──────
        page.goto(f"{BASE}/login", wait_until="load")
        page.evaluate("sessionStorage.removeItem('ppe.tempToken')")
        page.goto(f"{BASE}/2fa", wait_until="load")
        page.wait_for_url("**/login**", timeout=10000)
        check("3. /2fa không tempToken → về /login", "/login" in page.url, page.url)

        # ── 4. Login đúng → vào dashboard (regression) ───────────────────
        page.fill("#email", EMAIL)
        page.fill("#password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        wait_dashboard(page)
        check("4. Login đúng → vào /dashboard", "dashboard" in page.url, page.url)

        # ── 5. Reload giữ session (regression) ───────────────────────────
        page.reload(wait_until="load")
        wait_dashboard(page)
        check("5. Reload giữ session", "dashboard" in page.url and page.locator(f"text={EMAIL}").count() > 0)

        # ── 6. Đã login, Back về /login (client-side — proxy KHÔNG chạy) ──
        # Lớp 2 (public layout) phải bắt trường hợp này và redirect về /
        page.go_back(wait_until="load")
        page.wait_for_url("**/dashboard", timeout=10000)
        check("6. Back về /login khi đã login → public layout redirect /", "dashboard" in page.url, page.url)

        # ── 7. Đã login, F5 /login → proxy redirect (server-side) ────────
        page.goto(f"{BASE}/login", wait_until="load")
        page.wait_for_url("**/dashboard", timeout=10000)
        check("7. Đã login F5 /login → proxy redirect /", "dashboard" in page.url, page.url)

        # ── 8. Đã login, F5 /2fa → proxy redirect / (2fa = public-auth) ──
        page.goto(f"{BASE}/2fa", wait_until="load")
        page.wait_for_url("**/dashboard", timeout=10000)
        check("8. Đã login F5 /2fa → proxy redirect /", "dashboard" in page.url, page.url)

        # ── 9. Logout → guard về /login, cookies được clear (regression) ─
        page.goto(f"{BASE}/dashboard", wait_until="load")
        wait_dashboard(page)
        page.click("button:has-text('Đăng xuất')")
        page.wait_for_url("**/login**", timeout=15000)
        page.wait_for_timeout(800)
        check("9. Logout → về /login + hết cookie", "/login" in page.url and not has_session_cookies(context), page.url)

        # ── 10. Purge cookie khi session hết hạn (chống bounce loop) ─────
        # Giả lập đúng trạng thái thật: access token HẾT HẠN + refresh token
        # HẾT HẠN (forge 2 token HS256 hết hạn — không dùng session thật,
        # không kích hoạt reuse-detection revoke-all của BE).
        # Kỳ vọng: /me 401 TOKEN_EXPIRED → refresh fail → event → purge
        # (POST /auth/logout client trần) xóa cookie → về /login → F5 không bounce.
        page.fill("#email", EMAIL)
        page.fill("#password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_url("**/dashboard", timeout=15000)
        wait_dashboard(page)
        page.wait_for_timeout(500)
        real = {c["name"]: c["value"] for c in session_cookies(context)}
        check("10a. Lấy được 2 cookie thật", set(real) >= {"accessToken", "refreshToken"}, ", ".join(real))

        dead = [
            {
                "name": "accessToken",
                "value": forge_expired(real["accessToken"], env_secret("JWT_ACCESS_SECRET")),
                "url": BASE,
                "httpOnly": True,
                "secure": False,
                "sameSite": "Lax",
            },
            {
                "name": "refreshToken",
                "value": forge_expired(real["refreshToken"], env_secret("JWT_REFRESH_SECRET")),
                "url": BASE,
                "httpOnly": True,
                "secure": False,
                "sameSite": "Lax",
            },
        ]
        context.clear_cookies()
        context.add_cookies(dead)

        page.goto(f"{BASE}/dashboard", wait_until="load")
        page.wait_for_url("**/login**", timeout=20000)
        # Đợi purge (POST /auth/logout bằng client trần) hoàn tất
        for _ in range(10):
            if not has_session_cookies(context):
                break
            page.wait_for_timeout(400)
        check("10b. Session chết → về /login + cookie được purge", "/login" in page.url and not has_session_cookies(context), page.url)

        # F5 /login với cookie đã được purge → phải Ở NGUYÊN /login (không bounce)
        page.reload(wait_until="load")
        page.wait_for_timeout(1200)
        check("10c. F5 /login không còn bounce loop", "/login" in page.url and not has_session_cookies(context), page.url)

        # ── 11. mustChangePassword → ép về /change-password ──────────────
        # Flip tạm trong DB (có restore trong finally)
        old_flag = psql(f"SELECT must_change_password FROM users WHERE email='{EMAIL}';")
        psql(f"UPDATE users SET must_change_password = true WHERE email='{EMAIL}';")
        try:
            page.goto(f"{BASE}/login", wait_until="load")
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url("**/change-password", timeout=20000)
            ok = "/change-password" in page.url and page.locator('input[autocomplete="current-password"]').count() > 0
            check("11a. mustChangePassword → ép về /change-password", ok, page.url)

            # F5 giữ nguyên trang change-password (không bị đá)
            page.reload(wait_until="load")
            page.wait_for_timeout(1000)
            check("11b. F5 /change-password không bị đá đi", "/change-password" in page.url, page.url)

            # Vào /dashboard khi mustChangePassword → bị ép quay lại
            page.goto(f"{BASE}/dashboard", wait_until="load")
            page.wait_for_url("**/change-password", timeout=15000)
            check("11c. Truy cập /dashboard khi mustChange → quay lại /change-password", "/change-password" in page.url, page.url)
        finally:
            psql(f"UPDATE users SET must_change_password = '{old_flag}'::boolean WHERE email='{EMAIL}';")

        # Sau restore: vào lại /dashboard bình thường
        page.goto(f"{BASE}/dashboard", wait_until="load")
        page.wait_for_timeout(1500)
        check("11d. Sau restore flag → /dashboard vào bình thường", "dashboard" in page.url and not page.url.startswith(f"{BASE}/change-password"), page.url)

        # ── 12. Không console error bất thường ────────────────────────────
        # 404 "Failed to load resource" đến từ AuthShell slideshow dò ảnh minh họa
        # (auth-illustration-6..100 chưa tồn tại — hành vi có chủ đích của AuthShell)
        real_errors = [
            e for e in console_errors
            if "favicon" not in e.lower()
            and "401" not in e
            and "Unauthorized" not in e
            and "500" not in e
            and "Internal Server Error" not in e
            and "status of 404" not in e
            and "stream-ticket" not in e
        ]
        check("12. Không console error bất thường", len(real_errors) == 0, "; ".join(real_errors[:3]) if real_errors else "")

        browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
