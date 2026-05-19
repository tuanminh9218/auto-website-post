from playwright.sync_api import sync_playwright
import time

def debug_bottom():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        page = context.new_page()

        page.goto("https://mpuh.vn/admin", wait_until="networkidle")
        page.locator('input[type="text"]').fill("autoposter")
        page.locator('input[type="password"]').fill("123456")
        page.locator('input[type="password"]').press("Enter")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        
        page.locator('text="Quản lý tin tức"').click()
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        
        page.locator('button:has-text("Thêm mới"), a:has-text("Thêm mới")').first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        
        # Scroll to bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path="debug_5_bottom.png")
        
        # Also print all buttons
        buttons = page.locator('button').all_inner_texts()
        print("Buttons found:", buttons)

        browser.close()

if __name__ == "__main__":
    debug_bottom()
