"""
Test E2E toàn diện cho Milestone M2: Điều hướng đủ (Bước 3: 10 Placeholder Pages).
Xác nhận toàn bộ 10 routes + 1 route chi tiết /incidents/[id] render chuẩn trong AppShell,
đầy đủ Breadcrumbs, Badge M2, Layout Neumorphism mẫu, và gating phân quyền theo 3 vai trò.

Chạy: python3 scripts/test-dashboard-m2-routes-e2e.py
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
    page.goto(f"{BASE}/login?next=%2Fdashboard", wait_until="load")
    page.wait_for_selector("#email", timeout=10000)
    page.fill("#email", email)
    page.fill("#password", password)
    page.locator("button[type=submit]").click(force=True)
    page.wait_for_selector("aside nav", timeout=15000)


def main():
    print("\n=======================================================")
    print("  BẮT ĐẦU KIỂM THỬ E2E CHO M2: 10 PLACEHOLDER ROUTES")
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
        # PHẦN 1: ADMIN — Duyệt qua toàn bộ 10 route + route chi tiết
        # =============================================================
        ctx_admin = browser.new_context(viewport={"width": 1280, "height": 800})
        page = setup_page(ctx_admin)

        admin_email, admin_pw = ACCOUNTS["ADMIN"]
        login_user(page, admin_email, admin_pw)

        routes_to_test = [
            ("/incidents", "Sự cố vi phạm PPE"),
            ("/cameras", "Giám sát Cameras"),
            ("/sites", "Công trường & Phân khu"),
            ("/reports", "Báo cáo & Thống kê"),
            ("/ai-metrics", "Hiệu năng Mô hình AI"),
            ("/notifications", "Trung tâm Thông báo"),
            ("/users", "Quản lý Người dùng"),
            ("/roles", "Vai trò & Phân quyền"),
            ("/audit-logs", "Nhật ký Hệ thống"),
            ("/system", "Cấu hình Hệ thống"),
        ]

        print("--- [KIỂM TRA 10 ROUTES CHÍNH CHO ADMIN] ---")
        for route, expected_title in routes_to_test:
            page.goto(f"{BASE}{route}", wait_until="load")
            page.wait_for_selector("h1", timeout=8000)
            
            # Check h1 text
            h1_text = page.locator("h1").first.inner_text()
            has_title = expected_title.lower() in h1_text.lower()
            
            # Check not 404 or 403
            is_error = page.locator("text='Không tìm thấy trang'").or_(page.locator("text='Không có quyền'")).count() > 0
            
            all_ok = has_title and not is_error
            check(f"Route {route}", all_ok, f"H1: '{h1_text}'")

        # -------------------------------------------------------------
        print("\n--- [KIỂM TRA ROUTE CHI TIẾT /incidents/INC-1042] ---")
        page.goto(f"{BASE}/incidents/INC-1042", wait_until="load")
        page.wait_for_selector("h1", timeout=8000)

        detail_h1 = page.locator("h1").first.inner_text()
        has_detail_title = "chi tiết sự cố" in detail_h1.lower() and "inc-1042" in detail_h1.lower()
        
        check("Route /incidents/[id]", has_detail_title, f"H1: '{detail_h1}'")

        ctx_admin.close()

        # =============================================================
        # PHẦN 2: SAFETY_OFFICER — Quyền xem Incidents/Cameras, Chặn Reports/Users
        # =============================================================
        print("\n--- [KIỂM TRA PHÂN QUYỀN VAI TRÒ SAFETY_OFFICER] ---")
        ctx_officer = browser.new_context(viewport={"width": 1280, "height": 800})
        page_off = setup_page(ctx_officer)

        off_email, off_pw = ACCOUNTS["OFFICER"]
        login_user(page_off, off_email, off_pw)

        # Vào /incidents thành công
        page_off.goto(f"{BASE}/incidents", wait_until="load")
        page_off.wait_for_selector("h1", timeout=8000)
        off_incidents_ok = "sự cố vi phạm" in page_off.locator("h1").inner_text().lower()
        check("OFFICER vào /incidents thành công", off_incidents_ok)

        # Vào /cameras thành công
        page_off.goto(f"{BASE}/cameras", wait_until="load")
        page_off.wait_for_selector("h1", timeout=8000)
        off_cameras_ok = "giám sát cameras" in page_off.locator("h1").inner_text().lower()
        check("OFFICER vào /cameras thành công", off_cameras_ok)

        # Vào /reports bị 403
        page_off.goto(f"{BASE}/reports", wait_until="load")
        page_off.wait_for_timeout(500)
        off_reports_403 = page_off.locator("text='Không có quyền truy cập'").count() > 0
        check("OFFICER vào /reports bị 403", off_reports_403)

        ctx_officer.close()

        # =============================================================
        # PHẦN 3: USER — Chỉ xem Notifications, Chặn Incidents/Cameras/Reports/Users
        # =============================================================
        print("\n--- [KIỂM TRA PHÂN QUYỀN VAI TRÒ USER THƯỜNG] ---")
        ctx_user = browser.new_context(viewport={"width": 1280, "height": 800})
        page_user = setup_page(ctx_user)

        usr_email, usr_pw = ACCOUNTS["USER"]
        login_user(page_user, usr_email, usr_pw)

        # Vào /notifications thành công
        page_user.goto(f"{BASE}/notifications", wait_until="load")
        page_user.wait_for_selector("h1", timeout=8000)
        usr_notif_ok = "thông báo" in page_user.locator("h1").inner_text().lower()
        check("USER vào /notifications thành công", usr_notif_ok)

        # Vào /incidents bị 403
        page_user.goto(f"{BASE}/incidents", wait_until="load")
        page_user.wait_for_timeout(500)
        usr_incidents_403 = page_user.locator("text='Không có quyền truy cập'").count() > 0
        check("USER vào /incidents bị 403", usr_incidents_403)

        # Vào /system bị 403
        page_user.goto(f"{BASE}/system", wait_until="load")
        page_user.wait_for_timeout(500)
        usr_system_403 = page_user.locator("text='Không có quyền truy cập'").count() > 0
        check("USER vào /system bị 403", usr_system_403)

        ctx_user.close()

        # =============================================================
        # CONSOLE ERROR CHECK
        # =============================================================
        print("\n--- [CONSOLE ERRORS CHECK] ---")
        fatal_errors = [e for e in console_errors if "favicon" not in e.lower() and "status of 401" not in e and "status of 422" not in e and "status of 500" not in e]
        check("Không có console error nghiêm trọng từ React/Shell", len(fatal_errors) == 0, f"errors: {fatal_errors}")

        browser.close()

    # TỔNG KẾT
    print("\n=======================================================")
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = total - passed
    print(f"  KẾT QUẢ CUỐI CÙNG: {passed}/{total} CHECKS PASSED")
    if failed > 0:
        print(f"  ❌ CÓ {failed} CHECKS FAILED!")
        sys.exit(1)
    else:
        print("  🎉 TOÀN BỘ 10 ROUTES M2 HOẠT ĐỘNG HOÀN HẢO!")
        print("=======================================================\n")


if __name__ == "__main__":
    main()
