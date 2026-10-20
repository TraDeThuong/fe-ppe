"""Verify normalizeEmail fix trên cả 3 form auth với email full-width @."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin＠ppe.local"  # full-width @
PASSWORD = "Abcdef1!"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    for route in ["/login", "/register", "/forgot-password"]:
        context.clear_cookies()
        page.goto(f"{BASE}{route}", wait_until="load")
        page.fill("#email", EMAIL)
        if route == "/login":
            page.fill("#password", PASSWORD)
        if route == "/register":
            page.fill("#password", PASSWORD)
        page.click("button[type=submit]")
        page.wait_for_timeout(2500)
        body = page.inner_text("body")
        email_err = "Email không hợp lệ" in body or "Invalid email address" in body
        print(f"{route:22} -> lỗi email: {email_err} | URL: {page.url}")
    browser.close()
