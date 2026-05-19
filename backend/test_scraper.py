import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scraper import MedicalScraper

scraper = MedicalScraper()

print("=" * 60)
print("TEST DANTRI - Ung thu")
print("=" * 60)

# Test fetch list
URL = "https://dantri.com.vn/suc-khoe/ung-thu.htm"
articles = scraper.fetch_latest_articles(URL, limit=3)
print(f"\nTìm thấy {len(articles)} bài:")
for a in articles:
    print(f"  [{a['url'][-50:]}]")
    print(f"   {a['title'][:80]}")

# Test extract 1 bài
if articles:
    print("\n" + "=" * 60)
    print("EXTRACT BÀI ĐẦU TIÊN:")
    print("=" * 60)
    result = scraper.extract_article_content(articles[0]['url'])
    if result:
        print(f"\n✅ THÀNH CÔNG!")
        print(f"  Title:   {result['title'][:80]}")
        print(f"  Content: {len(result['content'])} chars")
        print(f"  Image:   {result['image_path']}")
    else:
        print("❌ THẤT BẠI - extract_article_content trả về None")
