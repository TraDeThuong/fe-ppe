"""
Test E2E cho Bước 7.2 — trang /login thật (react-hook-form + banner nghiệp vụ).

Chạy: python3 scripts/test-step7-2-login-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.
Script tự flip failed_login_attempts / locked_until / is_active của admin để test
(có restore trong finally) — chỉ dùng admin@ppe.local, không đụng user khác.

Bao phủ:
- Render trang login (AuthShell + form) + screenshot
- Validation client (zod): email sai định dạng, thiếu field
- 401 INVALID_CREDENTIALS → banner inline kèm số lần thử còn lại
- 423 ACCOUNT_LOCKED → banner + đếm ngược mm:ss từ message BE
- 403 USER_INACTIVE → banner + nút gửi lại email xác minh
- Login đúng → về next query (bảo vệ open-redirect)
"""
import re
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@ppe.local"
PASSWORD = "Admin@123456"

results = []


def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond))
    suffix = f" — {extra}" if extra else ""
    print(("  ✅ " if cond else "  ❌ ") + name + suffix)


def psql(sql: str) -> str:
    out = subprocess.run(
        ["docker", "exec", "ppe_postgres", "psql", "-U", "postgres",
         "-d", "ppe_identity_db", "-tAc", sql],
        capture_output=True, text=True, timeout=30,
    )
    if out.returncode != 0:
        raise RuntimeError(f"psql fail: {out.stderr}")
    return out.stdout.strip()


def db_state(email: str) -> dict:
    row = psql(
        f"SELECT failed_login_attempts || '|' || COALESCE(locked_until::text,'NULL') "
        f"|| '|' || is_active FROM users WHERE email='{email}';"
    )
    attempts, locked_until, is_active = row.split("|")
    return {"attempts": attempts, "locked_until": locked_until, "is_active": is_active}


def restore_db(email: str, state: dict) -> None:
    locked = "NULL" if state["locked_until"] == "NULL" else f"'{state['locked_until']}'::timestamptz"
    psql(
        f"UPDATE users SET failed_login_attempts={state['attempts']}, "
        f"locked_until={locked}, is_active={state['is_active']}::boolean "
        f"WHERE email='{email}';"
    )


def main() -> None:
    saved = db_state(EMAIL)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Render trang login ──────────────────────────────────
            page.goto(f"{BASE}/login", wait_until="load")
            page.wait_for_selector("form", timeout=10000)
            check("1a. Trang login render AuthShell + form",
                  page.locator("form").count() == 1
                  and page.locator("#email").count() == 1
                  and page.locator("#password").count() == 1)
            check("1b. Có link Quên mật khẩu + Đăng ký",
                  page.locator("text=Quên mật khẩu?").count() > 0
                  and page.locator("text=Đăng ký ngay").count() > 0)
            page.screenshot(path="/tmp/ppe-login.png", full_page=True)

            # ── 2. Validation client (zod) ─────────────────────────────
            page.fill("#email", "khong-phai-email")
            page.fill("#password", "")
            page.click("button[type=submit]")
            page.wait_for_selector("text=Email không hợp lệ.", timeout=5000)
            check("2. Email sai định dạng → lỗi inline zod", True)
            check("2b. Thiếu mật khẩu → lỗi inline zod",
                  page.locator("text=Vui lòng nhập mật khẩu.").count() > 0)

            # ── 3. 401 sai mật khẩu (user có thật) → banner kèm số lần thử ──
            page.fill("#email", EMAIL)
            page.fill("#password", "sai-mat-khau-123")
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=10000)
            alert_text = page.locator("form [role=alert]").first.inner_text()
            check("3a. 401 → banner nghiệp vụ của BE",
                  "Email hoặc mật khẩu không chính xác" in alert_text, alert_text[:80])
            check("3b. Banner kèm số lần thử còn lại",
                  "lần thử" in alert_text, alert_text[:80])
            check("3c. Mật khẩu được xóa để nhập lại",
                  page.input_value("#password") == "")

            # ── 4. 423 bị khóa → banner + đếm ngược từ message ─────────
            # Giả lập trạng thái khóa: 5 lần sai + locked_until 5 phút
            psql(
                f"UPDATE users SET failed_login_attempts=5, "
                f"locked_until=now() + interval '5 minutes' WHERE email='{EMAIL}';"
            )
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=10000)
            locked_text = page.locator("form [role=alert]").first.inner_text()
            check("4a. 423 → banner khóa tài khoản",
                  "tạm khóa" in locked_text, locked_text[:80])
            countdown_match = re.search(r"(\d{2}):(\d{2})", locked_text)
            check("4b. Đếm ngược mm:ss hiển thị", countdown_match is not None, locked_text[:80])
            first_countdown = countdown_match.group(0) if countdown_match else ""
            page.wait_for_timeout(2500)
            locked_text_2 = page.locator("form [role=alert]").first.inner_text()
            second_match = re.search(r"(\d{2}):(\d{2})", locked_text_2)
            second_countdown = second_match.group(0) if second_match else ""
            check("4c. Đếm ngược giảm dần theo giây",
                  second_countdown != "" and second_countdown != first_countdown,
                  f"{first_countdown} → {second_countdown}")
            check("4d. Nút đăng nhập bị khóa khi đang countdown",
                  page.locator("button[type=submit]").is_disabled())
            page.screenshot(path="/tmp/ppe-login-locked.png", full_page=True)

            # ── 5. 403 USER_INACTIVE → banner + nút gửi lại email ──────
            # Xóa lockout của test 4 trước (assertAccountNotLocked chạy trước check isActive)
            psql(f"UPDATE users SET failed_login_attempts=0, locked_until=NULL, "
                 f"is_active=false WHERE email='{EMAIL}';")
            page.goto(f"{BASE}/login", wait_until="load")
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_selector("form [role=alert]", timeout=10000)
            inactive_text = page.locator("form [role=alert]").first.inner_text()
            check("5a. 403 → banner tài khoản chưa kích hoạt",
                  "chưa được kích hoạt" in inactive_text, inactive_text[:80])
            check("5b. Banner có nút Gửi lại email xác minh",
                  page.locator("button:has-text('Gửi lại email xác minh')").count() > 0)
            page.screenshot(path="/tmp/ppe-login-inactive.png", full_page=True)

            # ── 6. Login đúng → redirect theo next (chặn open-redirect) ─
            psql(f"UPDATE users SET is_active=true WHERE email='{EMAIL}';")
            page.goto(f"{BASE}/login?next=%2Fdashboard", wait_until="load")
            page.fill("#email", EMAIL)
            page.fill("#password", PASSWORD)
            page.click("button[type=submit]")
            page.wait_for_url("**/dashboard", timeout=15000)
            check("6. Login đúng → về next=/dashboard", "dashboard" in page.url, page.url)

            # ── 7. Không console error bất thường ──────────────────────
            # 401/403/423 là các lỗi nghiệp vụ do test cố tình tạo (sai mật khẩu,
            # khóa tài khoản, vô hiệu hóa) — không tính là lỗi bất thường.
            # 404 "Failed to load resource" đến từ AuthShell slideshow dò ảnh minh họa
            # (auth-illustration-6..100 chưa tồn tại — hành vi có chủ đích của AuthShell)
            real_errors = [
                e for e in console_errors
                if "favicon" not in e.lower()
                and "401" not in e and "Unauthorized" not in e
                and "403" not in e and "Forbidden" not in e
                and "423" not in e and "Locked" not in e
                and "500" not in e and "Internal Server Error" not in e
                and "status of 404" not in e
                and "stream-ticket" not in e
            ]
            check("7. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-login-debug.png", full_page=True)
            except Exception:
                pass
            restore_db(EMAIL, saved)
            browser.close()

    passed = sum(1 for _, ok in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt")
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
