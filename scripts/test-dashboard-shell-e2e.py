"""
Test E2E toàn diện cho M1: Khung Dashboard chung (AppShell) — Playwright
Bao gồm toàn bộ 13 ca kiểm thử trong dashboard-shell-journey.md Bước 9 + Responsive mobile.

Chạy: python3 scripts/test-dashboard-shell-e2e.py
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

ACCOUNTS = {
    "ADMIN": ("admin@ppe.local", "Admin@123456"),
    "MANAGER": ("manager@ppe.local", "Manager@123456"),
    "OFFICER": ("officer@ppe.local", "Officer@123456"),
    "USER": ("user@ppe.local", "User@123456"),
}

results: list[tuple[str, bool, str]] = []


def check(name: str, cond: bool, extra: str = "") -> None:
    results.append((name, cond, extra))
    mark = "  ✅ " if cond else "  ❌ "
    suffix = f" — {extra}" if extra else ""
    print(f"{mark}{name}{suffix}")


def login_user(page, email: str, password: str) -> None:
    page.goto(f"{BASE}/login?next=%2Fdashboard", wait_until="load")
    page.wait_for_selector("#email", timeout=10000)
    page.fill("#email", email)
    page.fill("#password", password)
    page.locator("button[type=submit]").click(force=True)
    page.wait_for_selector("aside nav", timeout=15000)


def main():
    print("\n=======================================================")
    print("  BẮT ĐẦU KIỂM THỬ E2E CHO M1: APPSHELL (13 TEST CASES)")
    print("=======================================================\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        console_errors: list[str] = []

        def setup_page(ctx):
            page = ctx.new_page()
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: console_errors.append(str(e)))
            return page

        # =============================================================
        # PHẦN 1: ADMIN (Tests 1, 2, 12, 13, 9, 10, 11)
        # =============================================================
        ctx_admin = browser.new_context(viewport={"width": 1280, "height": 800})
        page = setup_page(ctx_admin)

        print("--- [TEST 1] Login ADMIN → xem sidebar (4 nhóm, 12 item) ---")
        admin_email, admin_pw = ACCOUNTS["ADMIN"]
        login_user(page, admin_email, admin_pw)

        nav_links = page.locator("aside nav a")
        link_count = nav_links.count()
        check("TEST 1: ADMIN thấy đủ 12 menu items", link_count == 12, f"thực tế: {link_count}")

        groups = page.locator("aside nav p").all_text_contents()
        expected_groups = ["GIÁM SÁT", "PHÂN TÍCH", "QUẢN TRỊ", "CÁ NHÂN"]
        has_all_groups = all(any(exp in g.upper() for g in groups) for exp in expected_groups)
        check("TEST 1: ADMIN thấy đủ 4 nhóm menu", has_all_groups, f"groups: {groups}")

        # SiteSelector có mặt ở ADMIN
        has_site_selector = page.locator("#site-selector-btn").count() > 0
        check("TEST 1: ADMIN có SiteSelector trên header", has_site_selector)

        # -------------------------------------------------------------
        print("\n--- [TEST 2] ADMIN gõ các route admin → Không 403 ---")
        admin_routes = ["/users", "/roles", "/audit-logs", "/system"]
        all_passed_2 = True
        for route in admin_routes:
            page.goto(f"{BASE}{route}", wait_until="load")
            page.wait_for_timeout(400)
            is_forbidden = page.locator("text='Không có quyền truy cập'").or_(page.locator("text='Access denied'")).count() > 0
            if is_forbidden:
                all_passed_2 = False
                check(f"TEST 2: ADMIN vào {route}", False, "bị 403")
            else:
                check(f"TEST 2: ADMIN vào {route}", True, "không bị 403 (render trong shell)")

        check("TEST 2: ADMIN truy cập 4 route quản trị không bị 403", all_passed_2)

        # -------------------------------------------------------------
        print("\n--- [TEST 12] Sidebar collapse + refresh ---")
        page.goto(f"{BASE}/dashboard", wait_until="load")
        page.wait_for_selector("aside button[aria-label='Toggle sidebar']")
        collapse_btn = page.locator("aside button[aria-label='Toggle sidebar']")
        collapse_btn.click(force=True)
        page.wait_for_timeout(400)
        collapsed_width = page.locator("aside").bounding_box()["width"]
        check("TEST 12: Bấm collapse: sidebar thu gọn về 64px", collapsed_width <= 70, f"width: {collapsed_width}px")

        # Refresh kiểm tra giữ trạng thái
        page.reload(wait_until="load")
        page.wait_for_timeout(800)
        reloaded_width = page.locator("aside").bounding_box()["width"]
        check("TEST 12: Refresh trang: sidebar vẫn giữ trạng thái thu gọn", reloaded_width <= 70, f"width: {reloaded_width}px")

        # Icon có tooltip title khi collapsed
        first_icon_title = page.locator("aside nav a").first.get_attribute("title")
        check("TEST 12: Icon có title tooltip khi collapsed", bool(first_icon_title), f"title: {first_icon_title}")

        # Mở rộng lại sidebar
        page.locator("aside button[aria-label='Toggle sidebar']").click(force=True)
        page.wait_for_timeout(400)

        # -------------------------------------------------------------
        print("\n--- [TEST 13] Realtime indicator dot ---")
        realtime_dot = page.locator("header span[title*='thời gian thực'], header span[title*='Realtime']")
        has_dot = realtime_dot.count() > 0
        dot_title = realtime_dot.get_attribute("title") if has_dot else ""
        check("TEST 13: Realtime dot hiển thị đúng trên header", has_dot, f"title: {dot_title}")

        # -------------------------------------------------------------
        print("\n--- [TEST 9] Đổi theme + EN/VI ---")
        lang_btn = page.locator("#locale-toggle-btn")
        curr_text = (lang_btn.text_content() or "").strip()
        if "EN" in curr_text:
            lang_btn.click()
            page.wait_for_timeout(300)
            btn_after_en = (lang_btn.text_content() or "").strip()
            check("TEST 9: Đổi sang EN: nút ngôn ngữ chuyển thành VI", btn_after_en == "VI")
            # Đổi lại VI
            lang_btn.click()
            page.wait_for_timeout(300)
            btn_after_vi = (lang_btn.text_content() or "").strip()
            check("TEST 9: Đổi lại VI: nút ngôn ngữ chuyển về EN", btn_after_vi == "EN")

        # Đổi theme
        theme_btn = page.locator("header button[aria-label*='giao diện']")
        initial_theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        theme_btn.click()
        page.wait_for_timeout(300)
        new_theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        check("TEST 9: Đổi theme: data-theme thay đổi", new_theme != initial_theme, f"{initial_theme} -> {new_theme}")
        theme_btn.click()
        page.wait_for_timeout(200)

        # -------------------------------------------------------------
        print("\n--- [TEST 10] Chuông thông báo ---")
        bell_btn = page.locator("#notification-bell-btn")
        bell_btn.click(force=True)
        page.wait_for_timeout(300)
        empty_notif = page.locator("text='Chưa có thông báo'").or_(page.locator("text='No notifications yet'")).count() > 0
        view_all_link = page.locator("header a[href='/notifications']").count() > 0
        check("TEST 10: Dropdown chuông mở: thấy empty state và link Xem tất cả", empty_notif and view_all_link)

        # Click ra ngoài đóng
        page.locator("main").click(position={"x": 50, "y": 50})
        page.wait_for_timeout(300)
        bell_closed = page.locator("text='Chưa có thông báo'").or_(page.locator("text='No notifications yet'")).count() == 0
        check("TEST 10: Click ra ngoài: dropdown chuông đóng", bell_closed)

        # -------------------------------------------------------------
        print("\n--- [TEST 11] Avatar menu ---")
        user_menu_btn = page.locator("#user-menu-btn")
        user_menu_btn.click(force=True)
        page.wait_for_timeout(300)
        has_security = page.locator("header a:has-text('Cài đặt bảo mật'), header a:has-text('Security settings')").count() > 0
        has_change_pwd = page.locator("header a:has-text('Đổi mật khẩu'), header a:has-text('Change password')").count() > 0
        has_logout = page.locator("#user-logout-btn").count() > 0
        has_role_badge = page.locator("header span:has-text('Quản trị viên'), header span:has-text('Administrator')").count() > 0
        check("TEST 11: UserMenu mở: role badge Quản trị viên + đủ 3 mục", has_security and has_change_pwd and has_logout and has_role_badge)

        # Click đăng xuất → về /login
        page.locator("#user-logout-btn").click(force=True)
        page.wait_for_url("**/login*", timeout=15000)
        check("TEST 11: Bấm Đăng xuất → chuyển về /login", "login" in page.url)

        ctx_admin.close()

        # =============================================================
        # PHẦN 2: SAFETY_MANAGER (Tests 3, 4)
        # =============================================================
        print("\n--- [TEST 3 & 4] SAFETY_MANAGER ---")
        ctx_mgr = browser.new_context(viewport={"width": 1280, "height": 800})
        page_mgr = setup_page(ctx_mgr)
        mgr_email, mgr_pw = ACCOUNTS["MANAGER"]
        login_user(page_mgr, mgr_email, mgr_pw)

        # TEST 3: Không thấy nhóm Quản trị; thấy Giám sát + Phân tích
        mgr_nav_text = page_mgr.locator("aside nav").all_text_contents()[0]
        has_monitoring = "GIÁM SÁT" in mgr_nav_text.upper() or "MONITORING" in mgr_nav_text.upper()
        has_analytics = "PHÂN TÍCH" in mgr_nav_text.upper() or "ANALYTICS" in mgr_nav_text.upper()
        has_admin = "QUẢN TRỊ" in mgr_nav_text.upper() or "ADMINISTRATION" in mgr_nav_text.upper()
        check("TEST 3: MANAGER thấy Giám sát + Phân tích", has_monitoring and has_analytics)
        check("TEST 3: MANAGER KHÔNG thấy nhóm Quản trị", not has_admin)
        check("TEST 3: MANAGER có SiteSelector trên header", page_mgr.locator("#site-selector-btn").count() > 0)

        # TEST 4: MANAGER gõ /users → 403
        page_mgr.goto(f"{BASE}/users", wait_until="load")
        page_mgr.wait_for_timeout(500)
        forbidden_403 = page_mgr.locator("text='Không có quyền truy cập'").or_(page_mgr.locator("text='Access denied'")).count() > 0
        back_btn = page_mgr.locator("main a[href='/dashboard']").count() > 0
        check("TEST 4: MANAGER gõ /users → 403 màn hình Không có quyền", forbidden_403 and back_btn)

        ctx_mgr.close()

        # =============================================================
        # PHẦN 3: SAFETY_OFFICER (Tests 5, 6)
        # =============================================================
        print("\n--- [TEST 5 & 6] SAFETY_OFFICER ---")
        ctx_off = browser.new_context(viewport={"width": 1280, "height": 800})
        page_off = setup_page(ctx_off)
        off_email, off_pw = ACCOUNTS["OFFICER"]
        login_user(page_off, off_email, off_pw)

        # TEST 5: Giám sát + Cá nhân; không thấy Báo cáo, AI metrics, Quản trị
        off_nav_text = page_off.locator("aside nav").all_text_contents()[0]
        has_reports = page_off.locator("aside a[href='/reports']").count() > 0
        has_ai = page_off.locator("aside a[href='/ai-metrics']").count() > 0
        has_admin_off = "QUẢN TRỊ" in off_nav_text.upper() or "ADMINISTRATION" in off_nav_text.upper()
        check("TEST 5: OFFICER KHÔNG thấy Báo cáo & Thống kê", not has_reports)
        check("TEST 5: OFFICER KHÔNG thấy Hiệu năng AI", not has_ai)
        check("TEST 5: OFFICER KHÔNG thấy nhóm Quản trị", not has_admin_off)
        check("TEST 5: OFFICER có SiteSelector trên header", page_off.locator("#site-selector-btn").count() > 0)

        # TEST 6: OFFICER gõ /reports → 403 + nút "Về Tổng quan" hoạt động
        page_off.goto(f"{BASE}/reports", wait_until="load")
        page_off.wait_for_timeout(500)
        forbidden_rep = page_off.locator("text='Không có quyền truy cập'").or_(page_off.locator("text='Access denied'")).count() > 0
        check("TEST 6: OFFICER gõ /reports → 403", forbidden_rep)

        # Bấm nút "Về Tổng quan"
        page_off.locator("main a[href='/dashboard'] button").click(force=True)
        page_off.wait_for_url("**/dashboard*", timeout=10000)
        check("TEST 6: OFFICER bấm 'Về Tổng quan' → chuyển về /dashboard", "dashboard" in page_off.url)

        ctx_off.close()

        # =============================================================
        # PHẦN 4: USER (Tests 7, 8)
        # =============================================================
        print("\n--- [TEST 7 & 8] USER ---")
        ctx_usr = browser.new_context(viewport={"width": 1280, "height": 800})
        page_usr = setup_page(ctx_usr)
        usr_email, usr_pw = ACCOUNTS["USER"]
        login_user(page_usr, usr_email, usr_pw)

        # TEST 7: Sidebar chỉ còn 3 item; KHÔNG có site selector trên header
        user_items_count = page_usr.locator("aside nav a").count()
        check("TEST 7: USER: sidebar chỉ có đúng 3 items (Tổng quan, Thông báo, Cài đặt)", user_items_count == 3, f"count: {user_items_count}")

        # Header KHÔNG có site selector
        site_selector = page_usr.locator("#site-selector-btn")
        check("TEST 7: USER: KHÔNG có SiteSelector trên header", site_selector.count() == 0)

        # TEST 8: USER gõ /incidents → 403
        page_usr.goto(f"{BASE}/incidents", wait_until="load")
        page_usr.wait_for_timeout(500)
        forbidden_inc = page_usr.locator("text='Không có quyền truy cập'").or_(page_usr.locator("text='Access denied'")).count() > 0
        check("TEST 8: USER gõ /incidents → 403", forbidden_inc)

        ctx_usr.close()

        # =============================================================
        # PHẦN 5: Responsive mobile (Bước 8)
        # =============================================================
        print("\n--- [BƯỚC 8 POLISH] Responsive Mobile (375x667) ---")
        ctx_mob = browser.new_context(viewport={"width": 375, "height": 667})
        page_mob = setup_page(ctx_mob)
        login_user(page_mob, admin_email, admin_pw)

        mob_aside_width = page_mob.locator("aside").bounding_box()["width"]
        check("BƯỚC 8: Mobile: sidebar tự động icon-only (w-16, 64px)", mob_aside_width <= 70, f"width: {mob_aside_width}px")

        header_width = page_mob.locator("header.sticky").bounding_box()["width"]
        check("BƯỚC 8: Mobile: header không bị tràn (<= 375px)", header_width <= 375, f"header width: {header_width}px")

        ctx_mob.close()

        # =============================================================
        # PHẦN 6: Console Errors Check
        # =============================================================
        print("\n--- [CONSOLE ERRORS CHECK] ---")
        real_errors = [e for e in console_errors if "favicon" not in e.lower() and "status of 401" not in e and "status of 422" not in e and "status of 500" not in e]
        check("Không có console error nghiêm trọng từ React/Shell", len(real_errors) == 0, f"errors: {real_errors}")

        browser.close()

    print("\n=======================================================")
    passed = sum(1 for _, c, _ in results if c)
    total = len(results)
    print(f"  KẾT QUẢ CUỐI CÙNG: {passed}/{total} CHECKS PASSED")
    print("=======================================================\n")

    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    main()
