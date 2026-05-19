import requests
from bs4 import BeautifulSoup
import urllib.parse
import os
import re

class MedicalScraper:
    def __init__(self, output_dir: str = "temp_images"):
        self.output_dir = output_dir
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        }

        # ================================================================
        # CẤU HÌNH THEO TỪNG WEBSITE (thêm site mới vào đây)
        # ================================================================
        self.SITE_CONFIG = {
            'dantri.com.vn': {
                'list_selectors':    ['article.article-item', 'h3.article-title a'],
                'link_in_item':      'h3.article-title a',          # Selector lấy <a> trong mỗi item
                'title_selectors':   ['h1.title-page', 'h1'],
                'content_selectors': [
                    'article.dt-flex.dt-flex-col',
                    'div.dt-flex.dt-flex-col.dt-space-y-6',
                    'article[class*="dt-"]',
                ],
                'image_selectors':   [
                    'figure img[src*="cdnphoto"]',
                    'article img[src*="dantri"]',
                    'img[src*="cdnphoto.dantri"]',
                ],
                'remove_selectors': ['.author-info', '.social-share', '.article-business',
                                     '.relate-news', '.box-tag', 'script', 'style'],
            },
            'suckhoedoisong.vn': {
                'list_selectors':    ['.box-category-item', '.article-list .item'],
                'link_in_item':      'a',
                'title_selectors':   ['h1.detail-title', 'h1.article-title', 'h1'],
                'content_selectors': ['.detail-content', '.article-content', '#main-detail'],
                'image_selectors':   ['.detail-content img', '.detail-avatar img'],
                'remove_selectors': ['.box-related', '.ad-zone', 'script', 'style'],
            },
            'baoyte.com': {
                'list_selectors':    ['.article-item', 'article', '.item-news'],
                'link_in_item':      'a',
                'title_selectors':   ['h1.article-title', 'h1.entry-title', 'h1'],
                'content_selectors': ['.article-content', '.entry-content', '.post-content'],
                'image_selectors':   ['.article-content img', 'figure img', '.thumbnail img'],
                'remove_selectors': ['.box-related', '.ad-zone', 'script', 'style'],
            },
            # Default cho các site chưa cấu hình
            '__default__': {
                'list_selectors':    ['article', '.article-item', '.news-item', '.item-news'],
                'link_in_item':      'a',
                'title_selectors':   ['h1'],
                'content_selectors': ['.article-content', '.detail-content', '.content-detail',
                                      '.entry-content', '.post-content', 'article'],
                'image_selectors':   ['article img', '.content img', 'figure img'],
                'remove_selectors': ['script', 'style', '.ad-zone', '.relate-news'],
            }
        }

    def _get_site_config(self, url: str) -> dict:
        """Lấy config phù hợp với domain của URL."""
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        for site_key in self.SITE_CONFIG:
            if site_key != '__default__' and site_key in domain:
                return self.SITE_CONFIG[site_key]
        return self.SITE_CONFIG['__default__']

    def fetch_latest_articles(self, category_url: str, limit: int = 5):
        """Lấy danh sách bài viết mới nhất từ trang danh mục."""
        try:
            config = self._get_site_config(category_url)
            parsed = urllib.parse.urlparse(category_url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"

            response = requests.get(category_url, headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            articles = []
            seen_urls = set()

            # Thử từng selector trong list
            for sel in config['list_selectors']:
                items = soup.select(sel)
                if not items:
                    continue

                for item in items:
                    # Nếu item là <a> thì dùng trực tiếp
                    if item.name == 'a':
                        link_tag = item
                    else:
                        # Tìm <a> bên trong theo link_in_item config
                        link_tag = item.select_one(config['link_in_item']) or item.find('a', href=True)

                    if not link_tag or not link_tag.get('href'):
                        continue

                    href = link_tag['href']
                    if not href.startswith('http'):
                        href = urllib.parse.urljoin(base_url, href)

                    # Bỏ qua URL trùng lặp và URL không phải bài viết
                    if href in seen_urls:
                        continue
                    if href == category_url or href.endswith('.htm') and 'suc-khoe' not in href and len(href) < 50:
                        continue

                    title = (link_tag.get('title') or link_tag.get_text(strip=True))[:200]
                    if not title or len(title) < 5:
                        continue

                    seen_urls.add(href)
                    articles.append({'title': title, 'url': href})

                    if len(articles) >= limit:
                        break

                if articles:
                    break  # Dừng khi đã tìm thấy bài

            print(f"  Tìm thấy {len(articles)} bài từ {category_url}")
            return articles[:limit]

        except Exception as e:
            print(f"Error fetching articles from {category_url}: {e}")
            return []

    def extract_article_content(self, article_url: str):
        """Trích xuất tiêu đề, nội dung và ảnh từ URL bài viết."""
        try:
            config = self._get_site_config(article_url)

            response = requests.get(article_url, headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            # === TITLE ===
            title = ""
            for sel in config['title_selectors']:
                tag = soup.select_one(sel)
                if tag:
                    title = tag.get_text(strip=True)
                    break
            if not title:
                # Fallback: dùng <title> của trang
                title_tag = soup.find('title')
                title = title_tag.get_text(strip=True).split(' - ')[0] if title_tag else ""

            # === CONTENT ===
            content_div = None
            for sel in config['content_selectors']:
                content_div = soup.select_one(sel)
                if content_div and len(content_div.get_text(strip=True)) > 200:
                    break

            # Fallback: tìm div có nhiều text nhất
            if not content_div:
                candidates = soup.find_all(['div', 'article', 'section'])
                best = max(candidates, key=lambda x: len(x.get_text(strip=True)), default=None)
                if best and len(best.get_text(strip=True)) > 200:
                    content_div = best

            if not content_div:
                print(f"  Không tìm thấy nội dung: {article_url}")
                return None

            # Xóa các phần không cần thiết
            for sel in config['remove_selectors']:
                for el in content_div.select(sel):
                    el.decompose()

            # Chủ động loại bỏ rác/quảng cáo như "Theo dõi Sức khỏe và Đời sống trên Google News"
            for tag in content_div.find_all(['a', 'p', 'div', 'span', 'strong', 'em']):
                if 'google news' in tag.get_text(strip=True).lower():
                    # Xóa thẻ nếu nội dung ngắn (để tránh xóa nhầm bài viết thực sự nói về Google News)
                    if len(tag.get_text(strip=True)) < 150:
                        tag.decompose()

            # Làm sạch ảnh lazy-load (data-src → src)
            for img in content_div.find_all('img'):
                lazy = img.get('data-src') or img.get('data-lazy-src') or img.get('data-original')
                if lazy:
                    img['src'] = lazy

            content_html = str(content_div)

            # === IMAGE (ảnh đại diện) ===
            image_url = None

            # Thử tìm ảnh từ Open Graph trước (chất lượng cao nhất)
            og_img = soup.select_one('meta[property="og:image"]')
            if og_img and og_img.get('content'):
                image_url = og_img['content']

            # Fallback: tìm trong content
            if not image_url:
                for sel in config['image_selectors']:
                    img_tag = soup.select_one(sel)
                    if img_tag:
                        src = img_tag.get('src') or img_tag.get('data-src') or ''
                        if src and not src.startswith('data:'):
                            image_url = src
                            break

            # Chuẩn hóa URL ảnh
            if image_url and not image_url.startswith('http'):
                parsed = urllib.parse.urlparse(article_url)
                image_url = urllib.parse.urljoin(f"{parsed.scheme}://{parsed.netloc}", image_url)

            local_image_path = None
            if image_url:
                local_image_path = self.download_image(image_url)

            print(f"  ✓ Title: {title[:60]}")
            print(f"  ✓ Content: {len(content_html)} chars")
            print(f"  ✓ Image: {local_image_path or 'Không có'}")

            return {
                'title': title,
                'content': content_html,
                'image_path': local_image_path,
                'source_url': article_url
            }

        except Exception as e:
            print(f"Error extracting article {article_url}: {e}")
            return None

    def download_image(self, url: str) -> str:
        """Tải ảnh về thư mục tạm."""
        try:
            response = requests.get(url, stream=True, headers=self.headers, timeout=15)
            response.raise_for_status()

            # Tạo tên file từ URL
            filename = os.path.basename(urllib.parse.urlparse(url).path)
            # Làm sạch tên file
            filename = re.sub(r'[^\w\-_\.]', '_', filename)
            if not filename or '.' not in filename:
                filename = "image.jpg"

            # Giới hạn độ dài tên file
            name, ext = os.path.splitext(filename)
            filename = name[:80] + ext

            filepath = os.path.join(self.output_dir, filename)

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(8192):
                    f.write(chunk)

            return filepath

        except Exception as e:
            print(f"  Error downloading image {url}: {e}")
            return None
