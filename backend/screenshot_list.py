from playwright.sync_api import sync_playwright
import time

def take_final_screenshot():
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
        time.sleep(5) # wait longer to make sure list loads
        
        page.screenshot(path="debug_6_final_list.png")
        browser.close()
        print("Done")

if __name__ == "__main__":
    take_final_screenshot()
