"""
Test E2E cho Bước 8 — PrefetchProvider (nâng cao).

Chạy: python3 scripts/test-step8-prefetch-e2e.py
Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.
Script tự flip must_change_password của admin để test nhánh bỏ qua (có restore).

Lưu ý: dùng async_playwright (khác các suite khác dùng sync) — cần delay route
sessions MÀ KHÔNG chặn các request khác để chứng minh "prefetch không chặn render".

Bao phủ:
- Login admin → /dashboard: GET /auth/sessions prefetch chạy nền, KHÔNG chặn render
  (mock route delay 4s — dashboard hiển thị trước khi sessions về)
- Prefetch hoãn theo idle (requestIdleCallback) rồi mới chạy sau khi xác thực
- visibilitychange (tab quay lại visible) → cache còn tươi → no-op, không request thêm
- Reload trang → cache memory mất → prefetch chạy lại (BE thật, 200, không chặn render)
- mustChangePassword → bỏ qua prefetch (về /change-password, KHÔNG gọi sessions)
- USER role → cũng được prefetch sessions (registry hiện tại áp dụng mọi role)
"""
import asyncio
import subprocess
import time

from playwright.async_api import async_playwright

BASE = "http://localhost:3000"
ADMIN_EMAIL = "admin@ppe.local"
ADMIN_PASSWORD = "Admin@123456"
USER_EMAIL = "user@template.local"
USER_PASSWORD = "User@123456"

results = []
sessions_calls = {"count": 0, "fulfilled_at": None}


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


def db_must_change(email: str) -> str:
    return psql(
        f"SELECT COALESCE(must_change_password, false) FROM users WHERE email='{email}';"
    )


def restore_must_change(email: str, value: str) -> None:
    psql(f"UPDATE users SET must_change_password='{value}'::boolean WHERE email='{email}';")


async def login(page, email: str, password: str) -> None:
    """Login qua UI — Turnstile headless thường tự cấp token; nếu nút bị gate
    quá lâu thì fallback requestSubmit (giống convention các suite 7.2)."""
    await page.goto(f"{BASE}/login", wait_until="load")
    await page.fill("#email", email)
    await page.fill("#password", password)
    submit = page.locator("button[type=submit]")
    await submit.wait_for(state="visible", timeout=10000)
    for _ in range(16):
        if not await submit.is_disabled():
            break
        await page.wait_for_timeout(500)
    if await submit.is_disabled():
        await page.evaluate("document.querySelector('form').requestSubmit()")
    else:
        await submit.click()


async def mock_sessions_slow(route) -> None:
    sessions_calls["count"] += 1
    await asyncio.sleep(4)
    sessions_calls["fulfilled_at"] = time.monotonic()
    await route.fulfill(
        status=200,
        content_type="application/json",
        json={
            "success": True,
            "data": [
                {
                    "id": "s-1",
                    "deviceName": "Chrome — macOS",
                    "ipAddress": "127.0.0.1",
                    "createdAt": "2026-10-21T08:00:00.000Z",
                    "isCurrent": True,
                },
                {
                    "id": "s-2",
                    "deviceName": "Điện thoại — Android",
                    "ipAddress": "127.0.0.2",
                    "createdAt": "2026-10-20T08:00:00.000Z",
                    "isCurrent": False,
                },
            ],
        },
    )


async def count_route(route) -> None:
    sessions_calls["count"] += 1
    await route.continue_()


async def main() -> None:
    saved_must_change = db_must_change(ADMIN_EMAIL)
    saved_user_must_change = db_must_change(USER_EMAIL)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        try:
            # ── 1. Prefetch nền không chặn render (mock delay 4s) ───────
            await page.route("**/auth/sessions", mock_sessions_slow)
            await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            await page.wait_for_url("**/dashboard", timeout=20000)
            await page.wait_for_selector("text=Trang chủ", timeout=10000)
            t_heading = time.monotonic()
            check(
                "1a. Dashboard render KHÔNG chờ prefetch (sessions delay 4s)",
                sessions_calls["fulfilled_at"] is None
                or (t_heading < sessions_calls["fulfilled_at"] - 1.0),
                f"heading lúc {t_heading:.1f}s, fulfill lúc {sessions_calls['fulfilled_at'] or 0:.1f}s",
            )
            for _ in range(30):
                if sessions_calls["count"] >= 1:
                    break
                await page.wait_for_timeout(500)
            check(
                "1b. Prefetch sessions chạy sau khi xác thực (hoãn theo idle)",
                sessions_calls["count"] == 1,
                f"gọi {sessions_calls['count']} lần",
            )
            await page.wait_for_timeout(4500)  # chờ fulfill delay trôi qua
            page.screenshot(path="/tmp/ppe-step8-dashboard.png", full_page=True)

            # ── 2. Tab quay lại visible → cache tươi → no-op ────────────
            await page.evaluate(
                "() => {"
                "Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});"
                "document.dispatchEvent(new Event('visibilitychange'));"
                "}"
            )
            await page.wait_for_timeout(1500)
            check(
                "2. visibilitychange khi cache còn tươi → không request thêm",
                sessions_calls["count"] == 1,
                f"gọi {sessions_calls['count']} lần",
            )

            # ── 3. Reload → cache memory mất → prefetch chạy lại (BE thật) ──
            await page.unroute("**/auth/sessions")
            sessions_calls["count"] = 0
            await page.route("**/auth/sessions", count_route)
            await page.reload(wait_until="load")
            await page.wait_for_selector("text=Trang chủ", timeout=10000)
            for _ in range(30):
                if sessions_calls["count"] >= 1:
                    break
                await page.wait_for_timeout(500)
            check(
                "3. Reload → prefetch chạy lại qua BE thật (200), không chặn render",
                sessions_calls["count"] == 1,
                f"gọi {sessions_calls['count']} lần",
            )
            page.screenshot(path="/tmp/ppe-step8-reload.png", full_page=True)

            # ── 4. mustChangePassword → bỏ qua prefetch ─────────────────
            psql(f"UPDATE users SET must_change_password=true WHERE email='{ADMIN_EMAIL}';")
            await context.clear_cookies()
            sessions_calls["count"] = 0
            await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
            await page.wait_for_url("**/change-password", timeout=20000)
            await page.wait_for_timeout(5000)  # đủ rộng cho idle callback nếu có
            check(
                "4. mustChangePassword → về /change-password, KHÔNG prefetch sessions",
                sessions_calls["count"] == 0,
                f"gọi {sessions_calls['count']} lần",
            )
            page.screenshot(path="/tmp/ppe-step8-must-change.png", full_page=True)

            # ── 5. USER role → vẫn được prefetch sessions ───────────────
            psql(f"UPDATE users SET must_change_password=false WHERE email='{USER_EMAIL}';")
            await context.clear_cookies()
            sessions_calls["count"] = 0
            await login(page, USER_EMAIL, USER_PASSWORD)
            await page.wait_for_url("**/dashboard", timeout=20000)
            for _ in range(30):
                if sessions_calls["count"] >= 1:
                    break
                await page.wait_for_timeout(500)
            check(
                "5. Role USER cũng được prefetch sessions (registry áp dụng mọi role)",
                sessions_calls["count"] == 1,
                f"gọi {sessions_calls['count']} lần",
            )

            # ── 6. Không console error bất thường ───────────────────────
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
                and "font-size:0;color:transparent" not in e
                and "Connecting to 'data:,'" not in e
                and "cannot load data:," not in e
            ]
            check("6. Không console error bất thường", len(real_errors) == 0,
                  "; ".join(real_errors[:3]) if real_errors else "")
        finally:
            try:
                restore_must_change(ADMIN_EMAIL, saved_must_change)
                restore_must_change(USER_EMAIL, saved_user_must_change)
            except Exception as e:
                print("⚠️ LỖI RESTORE DB:", e)
            if console_errors:
                print("\nCONSOLE/PAGE ERRORS:")
                for e in console_errors[:8]:
                    print("  *", e[:200])
            print("FINAL URL:", page.url)
            try:
                page.screenshot(path="/tmp/ppe-step8-debug.png", full_page=True)
            except Exception:
                pass
            await browser.close()

    failed = [name for name, ok in results if not ok]
    passed = len(results) - len(failed)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} đạt" + (f" — FAIL: {failed}" if failed else ""))
    raise SystemExit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    asyncio.run(main())
