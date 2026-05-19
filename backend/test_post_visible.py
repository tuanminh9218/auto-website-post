import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from browser_poster import BrowserPoster
from dotenv import load_dotenv
load_dotenv()

wp_url = os.getenv("WP_URL", "https://mpuh.vn")
wp_user = os.getenv("WP_USERNAME", "autoposter")
wp_pass = os.getenv("WP_APP_PASSWORD", "123456")

# Test voi headless=False de xem popup thuc te
poster = BrowserPoster(
    admin_url=f"{wp_url}/admin",
    username=wp_user,
    password=wp_pass,
    headless=False  # Hien thi browser de quan sat
)

result = poster.create_post(
    title="[TEST] Bai thu nghiem tu dong dang",
    content="<p>Day la noi dung thu nghiem de kiem tra quy trinh dang bai tu dong.</p>",
    image_path="temp_images/viem-hong-uong-nuoc-da-1-16983139739881080081157_resized_wm.jpg",
    location="Tin tuc su kien"
)

print(f"\n=== KET QUA: {'THANH CONG' if result else 'THAT BAI'} ===")
