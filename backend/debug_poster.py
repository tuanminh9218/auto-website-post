from playwright.sync_api import sync_playwright
import time

def debug_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        page = context.new_page()

        print("1. Going to login page...")
        page.goto("https://mpuh.vn/admin", wait_until="networkidle")
        page.screenshot(path="debug_1_login.png")

        print("2. Filling credentials...")
        page.locator('input[type="text"]').fill("autoposter")
        page.locator('input[type="password"]').fill("123456")
        page.locator('input[type="password"]').press("Enter")
        
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        page.screenshot(path="debug_2_dashboard.png")

        print("3. Clicking Quản lý tin tức...")
        try:
            page.locator('text="Quản lý tin tức"').click(timeout=5000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path="debug_3_news_list.png")
        except Exception as e:
            print("Failed to click Quản lý tin tức:", e)
            return

        print("4. Clicking Thêm mới...")
        try:
            # Look for button or a tag with text Thêm mới
            add_btn = page.locator('button:has-text("Thêm mới"), a:has-text("Thêm mới")')
            if add_btn.count() > 0:
                add_btn.first.click()
                page.wait_for_load_state("networkidle")
                time.sleep(3)
                page.screenshot(path="debug_4_add_new_form.png")
            else:
                print("No Thêm mới button found")
                return
        except Exception as e:
            print("Failed to click Thêm mới:", e)
            return
            
        browser.close()
        print("Debug script finished.")

if __name__ == "__main__":
    debug_login()
