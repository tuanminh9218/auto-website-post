import sys
import os

# Ensure utf-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Import the main logic
from main import scrape_job

print("=== BẮT ĐẦU CHẠY THỬ NGHIỆM PLAYWRIGHT ===")
print("Đang cào 2 bài viết mới nhất từ suckhoedoisong.vn và tiến hành đăng lên mpuh.vn/admin")

# Chạy job với limit=2
try:
    scrape_job("https://suckhoedoisong.vn/y-hoc-360.htm", limit=2)
except Exception as e:
    print(f"Error occurred: {e}")

print("=== KẾT THÚC THỬ NGHIỆM ===")
