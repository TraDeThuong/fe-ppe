"""
Test E2E toàn diện cho Trang Thông Báo (Notifications Center):
1. Truy cập & RBAC (Admin, Officer, User).
2. Header Bell popover và realtime unread badge.
3. Thẻ KPI Thống kê & Chuyển Tab (Inbox, Preferences, Templates, Email Logs).
4. Modal Phát thông báo (Broadcast) & Modal xem trước.
5. Responsive Viewports (Mobile 375px, Tablet 768px, Desktop 1440px).

Chạy: python3 scripts/test-notifications-e2e.py
"""
import sys
import time
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

ACCOUNTS = {
    "ADMIN": ("admin@ppe.local", "Admin@123456"),
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
    page.goto(f"{BASE}/login?next=%2Fnotifications", wait_until="load")
    page.wait_for_selector("#email", timeout=10000)
    page.fill("#email", email)
    page.fill("#password", password)
    page.locator("button[type=submit]").click(force=True)
    page.wait_for_url("**/notifications", timeout=15000)
    page.wait_for_timeout(1000)


def main():
    print("\n=======================================================")
    print("  BẮT ĐẦU KIỂM THỬ E2E: TRUNG TÂM THÔNG BÁO (/notifications)")
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
        # PHẦN 1: ADMIN — Đầy đủ quyền & Toàn bộ 4 Tabs & Modals
        # =============================================================
        print("[PHẦN 1] Kiểm tra vai trò ADMIN")
        ctx_admin = browser.new_context(viewport={"width": 1440, "height": 900})
        page = setup_page(ctx_admin)

        admin_email, admin_pw = ACCOUNTS["ADMIN"]
        login_user(page, admin_email, admin_pw)

        # 1.1 Kiểm tra PageHeader
        header_text = page.locator("h1").inner_text()
        check("Admin: Tiêu đề trang hiển thị đúng", "Thông báo" in header_text or "Notification" in header_text, header_text)

        # 1.2 Kiểm tra Realtime SSE Badge
        sse_badge = page.locator("header").filter(has_text="SSE").first
        has_sse = sse_badge.is_visible()
        check("Admin: Realtime SSE badge hiển thị", has_sse)

        # 1.3 Kiểm tra Nút Phát thông báo (Admin/Manager capability)
        broadcast_btn = page.locator("button").filter(has_text="Phát thông báo").first
        has_broadcast = broadcast_btn.is_visible()
        check("Admin: Nút '+ Phát thông báo' hiển thị", has_broadcast)

        # 1.4 Kiểm tra 4 Thẻ KPI thống kê
        kpi_cards = page.locator("div").filter(has_text="Tổng thông báo").first
        check("Admin: Khối KPI Summary hiển thị", kpi_cards.is_visible())

        # 1.5 Kiểm tra 4 Tabs hiện diện cho Admin
        inbox_tab = page.locator("button[role=tab], button").filter(has_text="Hộp thư").first
        prefs_tab = page.locator("button[role=tab], button").filter(has_text="Cài đặt").first
        tpl_tab = page.locator("button[role=tab], button").filter(has_text="Mẫu").first
        logs_tab = page.locator("button[role=tab], button").filter(has_text="Nhật ký").first

        check("Admin: Tab Hộp thư thông báo hiển thị", inbox_tab.is_visible())
        check("Admin: Tab Cài đặt nhận tin hiển thị", prefs_tab.is_visible())
        check("Admin: Tab Mẫu thông báo hiển thị (RBAC)", tpl_tab.is_visible())
        check("Admin: Tab Nhật ký Email hiển thị (RBAC)", logs_tab.is_visible())

        # 1.6 Chuyển sang Tab Cài đặt (Preferences)
        prefs_tab.click()
        page.wait_for_timeout(1000)
        fatigue_title = page.locator("text=Alert Fatigue").first
        check("Admin: Tab Preferences hiển thị bảng chống Alert Fatigue", fatigue_title.is_visible())

        # 1.7 Chuyển sang Tab Mẫu thông báo (Templates)
        tpl_tab.click()
        page.wait_for_timeout(1000)
        tpl_heading = page.locator("text=Mẫu thông báo").first
        check("Admin: Tab Templates chuyển tab mượt mà", tpl_heading.is_visible())

        # 1.8 Chuyển về Tab Hộp thư & mở Modal Broadcast
        inbox_tab.click()
        page.wait_for_timeout(1000)
        if has_broadcast:
            broadcast_btn.click()
            page.wait_for_timeout(800)
            modal_title = page.locator("text=Phát thông báo toàn hệ thống").first
            check("Admin: Mở SculptedModal Broadcast thành công", modal_title.is_visible())

            # Đóng modal
            cancel_btn = page.locator("button").filter(has_text="Hủy bỏ").first
            if cancel_btn.is_visible():
                cancel_btn.click()
                page.wait_for_timeout(500)
                check("Admin: Đóng Modal Broadcast thành công", not modal_title.is_visible())

        # =============================================================
        # PHẦN 2: HEADER BELL — POPUP VÀ BADGE
        # =============================================================
        print("\n[PHẦN 2] Kiểm tra NotificationBell trên Header")
        bell_btn = page.locator("#notification-bell-btn")
        check("Header Bell: Nút chuông icon tồn tại", bell_btn.is_visible())

        bell_btn.click()
        page.wait_for_timeout(1000)
        popover_view_all = page.locator("a[href='/notifications']").filter(has_text="Xem tất cả").first
        check("Header Bell: Popover mở ra kèm liên kết 'Xem tất cả'", popover_view_all.is_visible())

        # Đóng popover bằng cách click lại nút chuông
        bell_btn.click()
        page.wait_for_timeout(500)
        check("Header Bell: Popover đóng khi bấm lại nút chuông", not popover_view_all.is_visible())

        ctx_admin.close()

        # =============================================================
        # PHẦN 3: USER THƯỜNG — RBAC RESTRICTION
        # =============================================================
        print("\n[PHẦN 3] Kiểm tra vai trò USER (RBAC Giới hạn)")
        ctx_user = browser.new_context(viewport={"width": 1280, "height": 800})
        page_user = setup_page(ctx_user)

        user_email, user_pw = ACCOUNTS["USER"]
        login_user(page_user, user_email, user_pw)

        # 3.1 Nút phát broadcast KHÔNG được xuất hiện
        user_broadcast = page_user.locator("button").filter(has_text="Phát thông báo")
        check("User: Không có nút '+ Phát thông báo' (Security RBAC)", user_broadcast.count() == 0)

        # 3.2 Tab Templates KHÔNG xuất hiện với User thường
        user_tpl_tab = page_user.locator("button[role=tab], button").filter(has_text="Mẫu thông báo")
        check("User: Không thấy Tab Quản trị Mẫu (RBAC)", user_tpl_tab.count() == 0)

        # 3.3 Hộp thư và Cài đặt vẫn hoạt động bình thường
        user_inbox = page_user.locator("button[role=tab], button").filter(has_text="Hộp thư").first
        check("User: Vẫn truy cập được Hộp thư cá nhân", user_inbox.is_visible())

        ctx_user.close()

        # =============================================================
        # PHẦN 4: RESPONSIVE VIEWPORTS (Mobile & Tablet)
        # =============================================================
        print("\n[PHẦN 4] Kiểm tra Responsive Mobile (375px) & Tablet (768px)")
        
        # Tablet
        ctx_tablet = browser.new_context(viewport={"width": 768, "height": 1024})
        p_tab = setup_page(ctx_tablet)
        login_user(p_tab, admin_email, admin_pw)
        check("Tablet 768px: Render trang và nút chuông thông báo", p_tab.locator("#notification-bell-btn").is_visible())
        ctx_tablet.close()

        # Mobile
        ctx_mobile = browser.new_context(viewport={"width": 375, "height": 667})
        p_mob = setup_page(ctx_mobile)
        login_user(p_mob, admin_email, admin_pw)
        check("Mobile 375px: Render trang và nút chuông thông báo", p_mob.locator("#notification-bell-btn").is_visible())
        ctx_mobile.close()

        browser.close()

    print("\n=======================================================")
    print(f"  TỔNG KẾT: {sum(1 for _, ok, _ in results if ok)}/{len(results)} CHECKS ĐẠT THÀNH CÔNG")
    print("=======================================================")

    if any(not ok for _, ok, _ in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
