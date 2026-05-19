from playwright.sync_api import sync_playwright
import time
import os

def debug_full_submit():
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
        
        # Tiêu đề
        page.locator('input[placeholder*="tiêu đề"]').fill("Bài test tự động đăng 123")
        
        # Menu
        page.locator('div[class*="control"]').filter(has_text="Chọn menu").click()
        time.sleep(1)
        page.locator('text="Tin tức sự kiện"').first.click()
        
        # Mô tả ngắn
        page.locator('textarea[placeholder*="mô tả ngắn"]').fill("Đây là mô tả ngắn gọn...")
        
        # CKEditor
        page.evaluate('''
            var editorName = Object.keys(CKEDITOR.instances)[0];
            if (editorName) {
                CKEDITOR.instances[editorName].setData('<p>Nội dung chi tiết</p>');
            }
        ''')
        
        # Ảnh
        img_path = os.path.abspath("temp_images/anh-1-17787379544591288024219_resized_wm.jpg")
        page.locator('input[type="file"]').set_input_files(img_path)
        time.sleep(2)
        
        # Scroll & Submit
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.locator('button:has-text("Thêm mới")').last.click()
        time.sleep(1)
        
        # Take screenshot of bottom right after submit to see errors next to button
        page.screenshot(path="debug_submit_bottom.png")
        
        # Scroll to top to see if there's any toast message
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)
        page.screenshot(path="debug_submit_top.png")
        
        browser.close()
        print("Done")

if __name__ == "__main__":
    debug_full_submit()
