import sys, os
sys.stdout.reconfigure(encoding='utf-8')
import requests
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
URL = "https://dantri.com.vn/suc-khoe/dau-hieu-canh-bao-ung-thu-da-day-khi-di-ve-sinh-20260513111151027.htm"

res = requests.get(URL, headers=HEADERS, timeout=15)
soup = BeautifulSoup(res.content, 'html.parser')

# Tìm tất cả div/section có nhiều text nhất
print("=== TOP DIV BY TEXT LENGTH ===")
all_divs = soup.find_all(['div', 'section', 'article'])
divs_with_text = [(len(d.get_text(strip=True)), str(d.get('class', [])), d) for d in all_divs]
divs_with_text.sort(key=lambda x: x[0], reverse=True)

for length, cls, el in divs_with_text[:15]:
    print(f"  len={length:5d} | tag={el.name} | class={cls[:80]}")

# In HTML của div có nhiều text nhất (top 1 thường là body)
# Tìm div có class chứa "content" hoặc "body"
print("\n=== DIV CHỨA 'content' TRONG CLASS ===")
for el in soup.find_all(['div', 'section'], class_=True):
    classes = ' '.join(el.get('class', []))
    if any(kw in classes.lower() for kw in ['content', 'body', 'detail', 'article', 'text', 'desc']):
        text_len = len(el.get_text(strip=True))
        if text_len > 500:
            print(f"  class={classes[:100]} | len={text_len}")
            print(f"  HTML (200 chars): {str(el)[:200]}")
            print()
