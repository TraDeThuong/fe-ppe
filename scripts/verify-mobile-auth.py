import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUTPUT_DIR = "/Users/thanhtra/.gemini/antigravity-ide/brain/72821752-46ec-4461-a6eb-f10364df987b"

PAGES = [
    ("login", "/login"),
    ("register", "/register"),
    ("forgot_password", "/forgot-password"),
    ("reset_password", "/reset-password?token=dummy-token-123"),
    ("verify_email", "/verify-email?token=dummy-token-123"),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Test Mobile Viewport (iPhone 14 / 390x844)
        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        )
        mobile_page = mobile_context.new_page()
        
        for name, path in PAGES:
            url = f"{BASE}{path}"
            print(f"[Mobile] Navigating to {url}...")
            mobile_page.goto(url, wait_until="load")
            mobile_page.wait_for_timeout(1000)
            screenshot_path = os.path.join(OUTPUT_DIR, f"mobile_{name}.png")
            mobile_page.screenshot(path=screenshot_path, full_page=True)
            print(f"  -> Saved {screenshot_path}")
            
        # Also test 2FA with tempToken set
        mobile_page.evaluate("sessionStorage.setItem('ppe.tempToken', 'dummy-2fa-token')")
        mobile_page.goto(f"{BASE}/2fa", wait_until="load")
        mobile_page.wait_for_timeout(1000)
        screenshot_path = os.path.join(OUTPUT_DIR, "mobile_2fa.png")
        mobile_page.screenshot(path=screenshot_path, full_page=True)
        print(f"  -> Saved {screenshot_path}")

        # 2. Test Desktop Viewport (1440x900) to ensure desktop is still beautiful
        desktop_context = browser.new_context(viewport={"width": 1440, "height": 900})
        desktop_page = desktop_context.new_page()
        desktop_page.goto(f"{BASE}/login", wait_until="load")
        desktop_page.wait_for_timeout(1000)
        desktop_screenshot = os.path.join(OUTPUT_DIR, "desktop_login.png")
        desktop_page.screenshot(path=desktop_screenshot, full_page=True)
        print(f"[Desktop] Saved {desktop_screenshot}")

        browser.close()

if __name__ == "__main__":
    main()
