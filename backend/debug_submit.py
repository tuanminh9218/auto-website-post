from playwright.sync_api import sync_playwright
import time
import os

def test_single_submit():
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
        
        # 1. Fill Title (case sensitive placeholder in CSS, use lower case)
        page.locator('input[placeholder*="tiêu đề"]').fill("Bài test tự động đăng 123")
        
        # 2. Select Menu
        page.locator('div[class*="control"]').filter(has_text="Chọn menu").click()
        time.sleep(1)
        page.locator('text="Tin tức sự kiện"').first.click()
        
        # 3. Fill Short Desc
        page.locator('textarea[placeholder*="mô tả ngắn"]').fill("Đây là mô tả ngắn gọn...")
        
        # 4. Content
        frame = page.frame_locator('.cke_wysiwyg_frame').first
        frame.locator('body').fill("<p>Nội dung chi tiết của bài test.</p>")
        
        # 5. Image
        img_path = os.path.abspath("temp_images/anh-1-17787379544591288024219_resized_wm.jpg")
        try:
            page.locator('input[type="file"]').set_input_files(img_path)
            time.sleep(2)
        except Exception as e:
            print("Failed to upload image:", e)
        
        # SCROLL DOWN
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path="debug_7_before_submit.png")
        
        # 6. Click Submit
        page.locator('button:has-text("Thêm mới")').last.click()
        time.sleep(5)
        
        # Check for errors
        page.screenshot(path="debug_8_after_submit.png")
        
        browser.close()
        print("Done")

if __name__ == "__main__":
    test_single_submit()
