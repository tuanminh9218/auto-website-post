"""
Script debug: Mở form thêm tin tức, in ra HTML của vùng menu dropdown
để tìm đúng selector cần dùng.
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
import time

load_dotenv()
wp_url = os.getenv("WP_URL", "https://mpuh.vn")
wp_user = os.getenv("WP_USERNAME", "autoposter")
wp_pass = os.getenv("WP_APP_PASSWORD", "123456")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 900})

    # Login
    page.goto(f"{wp_url}/admin", wait_until="networkidle")
    page.fill('input[type="text"], input[type="email"]', wp_user)
    page.fill('input[type="password"]', wp_pass)
    page.press('input[type="password"]', "Enter")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Go to news list
    page.locator('a:has-text("Quan ly tin tuc"), span:has-text("Quan ly tin tuc"), a:has-text("Qu"), li:has-text("Qu")').first.click()
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    # Click add new
    page.locator('a:has-text("Them moi"), button:has-text("Them moi"), a:has-text("Th"), button:has-text("Th")').first.click()
    page.wait_for_load_state("networkidle")
    time.sleep(3)

    # Print all input/select/button elements
    print("=== ALL SELECTS ===")
    selects = page.locator("select").all()
    for s in selects:
        print("SELECT:", s.get_attribute("name"), s.get_attribute("id"), s.get_attribute("class"))

    print("\n=== DROPDOWN CONTAINERS (likely menu) ===")
    # Look for the menu label and its sibling
    menu_label = page.locator('label:has-text("Menu"), label:has-text("menu")')
    if menu_label.count() > 0:
        # Get parent HTML
        parent_html = menu_label.first.evaluate("el => el.parentElement.outerHTML")
        print("Menu container HTML:\n", parent_html[:2000])

    print("\n=== ANT SELECT COMPONENTS ===")
    ant_selects = page.locator('.ant-select, [class*="ant-select"]').all()
    for i, s in enumerate(ant_selects[:5]):
        print(f"AntSelect[{i}]:", s.get_attribute("class")[:100])
        try:
            inner = s.inner_html()[:300]
            print("  Inner:", inner)
        except:
            pass

    print("\n=== FULL FORM HTML (first 5000 chars) ===")
    form = page.locator('form, .ant-form, [class*="form"]').first
    if form.count() > 0:
        print(form.inner_html()[:5000])
    else:
        # Just get body
        print(page.locator('main, .main-content, #root').first.inner_html()[:5000])

    page.screenshot(path="debug_inspect_form.png")
    browser.close()
    print("\nDone! Check debug_inspect_form.png")
