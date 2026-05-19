import os
import sys

# Force utf-8 encoding for standard output to avoid charmap errors on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from typing import List, Optional
from dotenv import load_dotenv

from scraper import MedicalScraper
from image_processor import ImageProcessor
from browser_poster import BrowserPoster
from scheduler import TaskScheduler
from ai_service import GeminiService
from apscheduler.schedulers.background import BackgroundScheduler
import datetime
import urllib.parse

# Bảng ánh xạ domain → tên hiển thị thân thiện cho nguồn tham khảo
DOMAIN_DISPLAY_NAMES = {
    'dantri.com.vn':        'Dân Trí',
    'suckhoedoisong.vn':    'Sức Khỏe Đời Sống',
    'baoyte.com':           'Báo Y Tế',
    'tuoitre.vn':           'Tuổi Trẻ',
    'vnexpress.net':        'VnExpress',
    'baomoi.com':           'Báo Mới',
    'nhandan.vn':           'Nhân Dân',
    'suckhoevadoisong.vn':  'Sức Khỏe & Đời Sống',
    'tienphong.vn':         'Tiền Phong',
    'vietnamnet.vn':        'VietnamNet',
    'thanhnien.vn':         'Thanh Niên',
    'laodong.vn':           'Lao Động',
    'baosuckhoe.vn':        'Báo Sức Khỏe',
}

def get_source_name(url: str) -> str:
    """Trịch xuất tên hiển thị của nguồn từ URL."""
    domain = urllib.parse.urlparse(url).netloc.replace('www.', '')
    return DOMAIN_DISPLAY_NAMES.get(domain, domain)

# Database imports
import models
from database import engine, get_db
from sqlalchemy.orm import Session
from fastapi import Depends

# Create tables
models.Base.metadata.create_all(bind=engine)

# Load environment variables
load_dotenv()

app = FastAPI(title="Auto Post Manager API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend files if available (production build)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    @app.get("/", include_in_schema=False)
    async def serve_frontend_root():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
    
    @app.get("/{path:path}", include_in_schema=False)
    async def serve_frontend_spa(path: str):
        # API routes are already registered above, this catches frontend routes
        file_path = os.path.join(STATIC_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # SPA fallback: return index.html for all non-API, non-file routes
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

# Global instances
scraper = MedicalScraper()
img_processor = ImageProcessor(watermark_text="mpuh.vn")
scheduler = TaskScheduler()
ai_service = GeminiService()

# Setup Auto Publisher Scheduler
auto_publisher = BackgroundScheduler()

def check_scheduled_posts():
    db = next(get_db())
    try:
        now = datetime.datetime.now()
        # Find pending posts where scheduled_time <= now
        posts_to_publish = db.query(models.Post).filter(
            models.Post.status == "pending",
            models.Post.scheduled_time <= now
        ).order_by(models.Post.scheduled_time.asc()).all()
        
        if not posts_to_publish:
            return
            
        # Nếu có nhiều bài quá hạn cùng lúc, chỉ đăng 1 bài, dời lịch các bài khác cách nhau 5 phút
        if len(posts_to_publish) > 1:
            for i, p in enumerate(posts_to_publish[1:], start=1):
                p.scheduled_time = now + datetime.timedelta(minutes=5 * i)
            db.commit()
            print(f"Phát hiện {len(posts_to_publish)} bài quá hạn. Đăng bài đầu tiên, dời lại {len(posts_to_publish)-1} bài mỗi bài cách nhau 5 phút.")
        
        post = posts_to_publish[0]
        print(f"Auto-publishing scheduled post: {post.title}")
        success = browser_client.create_post(
            title=post.title,
            content=post.content,
            image_path=post.image_path,
            location=post.location or "Tin tức sự kiện"
        )
        if success:
            post.status = "published"
            post.published_at = datetime.datetime.now()
            db.commit()
            print(f"Successfully auto-published: {post.title}")
        else:
            post.status = "failed"
            db.commit()
            print(f"Failed to auto-publish: {post.title}")
    except Exception as e:
        print(f"Scheduler error: {e}")
    finally:
        db.close()

def check_scheduled_scraping():
    """Kiểm tra và chạy cào tự động nếu thời gian hiện tại khớp với cấu hình tần suất."""
    db = next(get_db())
    try:
        now = datetime.datetime.now()
        current_time_str = now.strftime("%H:%M")
        
        active_sources = db.query(models.ScrapedSource).filter(models.ScrapedSource.is_active == True).all()
        for source in active_sources:
            if not source.frequency:
                continue
            
            # frequency chứa dạng "08:00, 15:30"
            times = [t.strip() for t in source.frequency.split(',') if t.strip()]
            if current_time_str in times:
                # Ngăn chặn việc chạy nhiều lần trong cùng 1 phút
                if source.last_run_at and source.last_run_at.strftime("%Y-%m-%d %H:%M") == now.strftime("%Y-%m-%d %H:%M"):
                    continue
                    
                print(f"Time matched! Auto scraping source: {source.name} at {current_time_str}")
                source.last_run_at = now
                
                # Update start_post_time for next scheduled run
                if source.start_post_time:
                    # Chuyển start_post_time sang ngày hôm sau (hoặc giờ tương ứng)
                    source.start_post_time += datetime.timedelta(days=1)
                    
                db.commit()
                
                # Gọi trực tiếp vì đang ở trong background thread của APScheduler
                scrape_job(source.url, source.limit, source.auto_post, source.start_post_time, source.post_interval_minutes)
    except Exception as e:
        print(f"Scraper scheduler error: {e}")
    finally:
        db.close()

auto_publisher.add_job(check_scheduled_posts, 'interval', minutes=1)
auto_publisher.add_job(check_scheduled_scraping, 'interval', minutes=1)
auto_publisher.start()

# WP Client initialized from .env if available
wp_url = os.getenv("WP_URL", "https://mpuh.vn")
wp_user = os.getenv("WP_USERNAME", "autoposter")
wp_pass = os.getenv("WP_APP_PASSWORD", "123456")
browser_client = BrowserPoster(admin_url=f"{wp_url}/admin", username=wp_user, password=wp_pass, headless=True)

class PostData(BaseModel):
    title: str
    content: str
    tags: Optional[List[str]] = []
    category: Optional[str] = None
    schedule_time: Optional[str] = None

class PostUpdate(BaseModel):
    title: str
    content: str
    location: str
    scheduled_time: Optional[str] = None

class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    image_path: Optional[str]
    source_url: Optional[str] = None
    location: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    published_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class ScrapeRequest(BaseModel):
    url: str
    limit: Optional[int] = 5
    auto_post: Optional[bool] = False
    start_post_time: Optional[datetime.datetime] = None
    post_interval_minutes: Optional[int] = 0

class SourceCreate(BaseModel):
    name: str
    url: str
    limit: Optional[int] = 2
    frequency: Optional[str] = "08:00, 15:30"
    location: Optional[str] = "Tin tức sự kiện"
    auto_post: Optional[bool] = False
    start_post_time: Optional[datetime.datetime] = None
    post_interval_minutes: Optional[int] = 0

class SourceResponse(BaseModel):
    id: int
    name: str
    url: str
    limit: int
    frequency: str
    location: str
    auto_post: bool
    is_active: bool
    start_post_time: Optional[str] = None
    post_interval_minutes: int
    created_at: Optional[str] = None
    last_run_at: Optional[str] = None

    class Config:
        from_attributes = True

def process_and_post_article(article_url: str, db: Session, auto_post: bool = False, schedule_time: Optional[datetime.datetime] = None):
    """Full pipeline: scrape -> process image -> save to DB -> (optional) post."""
    print(f"Processing article: {article_url}")
    
    # Check if already in DB
    existing_post = db.query(models.Post).filter(models.Post.source_url == article_url).first()
    if existing_post:
        print("Article already in database. Skipping.")
        return False

    article = scraper.extract_article_content(article_url)
    
    if not article:
        print("Failed to extract article content.")
        return False
        
    watermarked_path = None
    if article['image_path']:
        # Pipeline đầy đủ: crop 16:9 → resize → watermark
        watermarked_path = img_processor.full_process(article['image_path'])
        
    # Rewrite content using Gemini AI
    print("Rewriting content using Gemini AI...")
    rewritten_content = ai_service.rewrite_content(article['content'])
    
    # Tạo nguồn tham khảo động theo domain thực tế
    _source_name = get_source_name(article_url)
    
    # Gói nội dung vào thẻ div 50%, căn giữa, dàn đều và có style cho ảnh
    post_content = f"""
<div style="width: 50%; min-width: 320px; margin: 0 auto; text-align: justify;" class="auto-article-container">
    <style>
        .auto-article-container img {{
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 10px auto;
        }}
        .auto-article-container figure {{
            max-width: 100% !important;
            margin: 10px auto;
        }}
    </style>
    {rewritten_content}
    <p style="text-align: right; margin-top: 5px;"><em>Nguồn tham khảo: <a href='{article_url}' target='_blank'>{_source_name}</a></em></p>
</div>
"""

    # Tính toán schedule_time nếu có
    final_schedule_time = None
    if auto_post and schedule_time:
        final_schedule_time = schedule_time
    
    # Save to Database as Pending
    new_post = models.Post(
        title=article['title'],
        content=post_content,
        short_desc=None,
        image_path=watermarked_path,
        source_url=article_url,
        status="pending",
        scheduled_time=final_schedule_time
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    print(f"Saved post to database with ID: {new_post.id}")
    
    # Auto post if requested AND no future schedule time
    if auto_post:
        if final_schedule_time and final_schedule_time > datetime.datetime.now():
            print(f"  → Bài viết đã được lên lịch lúc: {final_schedule_time}")
            return True
            
        # Tự động đăng ngay lập tức
        # Tạo ảnh placeholder nếu bài không có ảnh
        publish_image = new_post.image_path
        if not publish_image or not os.path.exists(publish_image):
            print("  Bài không có ảnh → Tạo ảnh placeholder...")
            publish_image = img_processor.create_placeholder_image(title=new_post.title)
        
        success = browser_client.create_post(
            title=new_post.title,
            content=new_post.content,
            image_path=publish_image,
            location=new_post.location or "Tin tức sự kiện"
        )
        if success:
            new_post.status = "published"
            new_post.published_at = datetime.datetime.now()
            db.commit()
            print(f"Successfully created post via automation")
            return True
            
    return True

def scrape_job(url: str, limit: int, auto_post: bool = False, start_time: Optional[datetime.datetime] = None, interval_minutes: int = 0):
    """Job to run in background or scheduled."""
    print(f"Starting scrape job for {url}")
    articles = scraper.fetch_latest_articles(url, limit=limit)
    
    # Get a dedicated DB session for this thread
    db = next(get_db())
    
    try:
        current_schedule_time = start_time
        # Đảm bảo nếu start_time đã qua thì cập nhật lên ít nhất là thời điểm hiện tại
        if current_schedule_time and current_schedule_time < datetime.datetime.now():
            current_schedule_time = datetime.datetime.now() + datetime.timedelta(minutes=5)
            
        for item in articles:
            processed = process_and_post_article(item['url'], db, auto_post=auto_post, schedule_time=current_schedule_time)
            # Chỉ tăng thời gian nếu bài viết được cào mới (không bị skip do đã tồn tại)
            if processed and current_schedule_time and interval_minutes > 0:
                current_schedule_time += datetime.timedelta(minutes=interval_minutes)
    except Exception as e:
        print(f"Scrape job error: {e}")
    finally:
        db.close()
        
    print(f"Completed scraping {len(articles)} articles.")

@app.get("/")
def read_root():
    return {"message": "Welcome to Auto Post Manager API"}

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_posts = db.query(models.Post).count()
    published_posts = db.query(models.Post).filter(models.Post.status == 'published').count()
    pending_posts = db.query(models.Post).filter(models.Post.status == 'pending').count()
    active_sources = db.query(models.ScrapedSource).filter(models.ScrapedSource.is_active == True).count()
    
    now = datetime.datetime.now()
    upcoming_posts_qs = db.query(models.Post).filter(
        models.Post.status == 'pending',
        models.Post.scheduled_time != None,
        models.Post.scheduled_time > now
    ).order_by(models.Post.scheduled_time.asc()).limit(5).all()
    
    upcoming_posts = []
    for p in upcoming_posts_qs:
        upcoming_posts.append({
            "id": p.id,
            "title": p.title,
            "scheduled_time": p.scheduled_time.isoformat(),
            "status": "Đã lên lịch"
        })
        
    sources_qs = db.query(models.ScrapedSource).filter(models.ScrapedSource.is_active == True).limit(5).all()
    active_sources_list = [s.name for s in sources_qs]
    
    return {
        "total_posts": total_posts,
        "published_posts": published_posts,
        "pending_posts": pending_posts,
        "active_sources": active_sources,
        "upcoming_posts": upcoming_posts,
        "active_sources_list": active_sources_list
    }

@app.get("/api/posts", response_model=List[PostResponse])
def get_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).order_by(models.Post.id.desc()).all()
    result = []
    for p in posts:
        p_dict = {
            "id": p.id,
            "title": p.title,
            "content": p.content,
            "image_path": p.image_path,
            "source_url": p.source_url,
            "location": p.location,
            "scheduled_time": p.scheduled_time.isoformat() if p.scheduled_time else None,
            "status": p.status,
            "created_at":   p.created_at.isoformat()   if p.created_at   else None,
            "published_at": p.published_at.isoformat()  if p.published_at  else None,
            "updated_at":   p.updated_at.isoformat()   if p.updated_at   else None,
        }
        result.append(p_dict)
    return result

@app.put("/api/posts/{post_id}")
def update_post(post_id: int, post_update: PostUpdate, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post.title = post_update.title
    post.content = post_update.content
    post.location = post_update.location
    if post_update.scheduled_time:
        import datetime
        post.scheduled_time = datetime.datetime.fromisoformat(post_update.scheduled_time.replace('Z', ''))
    else:
        post.scheduled_time = None
        
    import datetime
    post.updated_at = datetime.datetime.utcnow()
        
    db.commit()
    
    # Nếu bài đã đăng, thì gọi script sửa bài trên WordPress
    if post.status == "published":
        print(f"Cập nhật nội dung bài viết đã đăng: {post.title}")
        success = browser_client.update_post(
            title=post.title,
            new_content=post.content,
            location=post.location or "Tin tức sự kiện"
        )
        if success:
            print("Cập nhật trên website thành công!")
        else:
            print("Cập nhật trên website thất bại!")
            
    return {"status": "success"}

@app.delete("/api/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"status": "success"}

@app.post("/api/posts/{post_id}/publish")
def publish_post_now(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Tạo ảnh placeholder nếu bài không có ảnh (ảnh là trường bắt buộc trên website)
    publish_image = post.image_path
    if not publish_image or not os.path.exists(publish_image):
        print(f"  Bài ID={post_id} không có ảnh → Tạo ảnh placeholder...")
        publish_image = img_processor.create_placeholder_image(title=post.title)
        if publish_image:
            # Lưu path placeholder vào DB
            post.image_path = publish_image
            db.commit()

    # Đánh dấu đang xử lý (kể cả khi retry từ failed)
    post.status = "publishing"
    db.commit()

    success = browser_client.create_post(
        title=post.title,
        content=post.content,
        image_path=publish_image,
        location=post.location or "Tin tức sự kiện"
    )
    
    if success:
        post.status = "published"
        post.published_at = datetime.datetime.now()
        db.commit()
        return {"status": "success", "message": "Đã đăng bài thành công!"}
    
    post.status = "failed"
    post.published_at = None
    db.commit()
    raise HTTPException(status_code=500, detail="Lỗi khi đăng bài")

@app.post("/api/posts")
def create_manual_post(post: PostData, db: Session = Depends(get_db)):
    new_post = models.Post(
        title=post.title,
        content=post.content,
        location=post.category or "Tin tức sự kiện",
        status="pending"
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return {"status": "success", "id": new_post.id}

@app.post("/api/scrape")
def trigger_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(scrape_job, request.url, request.limit, request.auto_post, request.start_post_time, request.post_interval_minutes)
    return {"status": "success", "message": f"Scraping from {request.url} initiated in background"}

@app.post("/api/schedule/start")
def start_schedule(url: str, minutes: int = 120):
    job_id = f"scrape_{hash(url)}"
    scheduler.add_interval_job(scrape_job, job_id, minutes=minutes, args=[url, 5])
    return {"status": "success", "message": f"Scheduled job every {minutes} minutes"}

@app.get("/api/schedule/jobs")
def list_jobs():
    return {"jobs": scheduler.get_jobs()}

# ==========================================
# SCRAPED SOURCES CRUD API
# ==========================================

def _source_to_dict(s) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "url": s.url,
        "limit": s.limit,
        "frequency": s.frequency,
        "location": s.location,
        "auto_post": s.auto_post,
        "is_active": s.is_active,
        "start_post_time": s.start_post_time.isoformat() if s.start_post_time else None,
        "post_interval_minutes": s.post_interval_minutes,
        "created_at":  s.created_at.isoformat()  if s.created_at  else None,
        "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
    }

@app.get("/api/sources", response_model=List[SourceResponse])
def get_sources(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả nguồn cào."""
    sources = db.query(models.ScrapedSource).order_by(models.ScrapedSource.id.desc()).all()
    return [_source_to_dict(s) for s in sources]

@app.post("/api/sources", response_model=SourceResponse)
def create_source(source: SourceCreate, db: Session = Depends(get_db)):
    """Thêm nguồn cào mới."""
    # Kiểm tra URL đã tồn tại chưa
    existing = db.query(models.ScrapedSource).filter(models.ScrapedSource.url == source.url).first()
    if existing:
        raise HTTPException(status_code=400, detail="URL nguồn này đã tồn tại!")
    new_source = models.ScrapedSource(
        name=source.name,
        url=source.url,
        limit=source.limit,
        frequency=source.frequency,
        location=source.location,
        auto_post=source.auto_post,
        start_post_time=source.start_post_time,
        post_interval_minutes=source.post_interval_minutes,
        is_active=True,
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    return _source_to_dict(new_source)

@app.patch("/api/sources/{source_id}/toggle")
def toggle_source(source_id: int, db: Session = Depends(get_db)):
    """Bật/tắt nguồn cào (active ↔ paused)."""
    source = db.query(models.ScrapedSource).filter(models.ScrapedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguồn")
    source.is_active = not source.is_active
    db.commit()
    return {"status": "success", "is_active": source.is_active}

@app.delete("/api/sources/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db)):
    """Xóa nguồn cào."""
    source = db.query(models.ScrapedSource).filter(models.ScrapedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguồn")
    db.delete(source)
    db.commit()
    return {"status": "success"}

@app.put("/api/sources/{source_id}", response_model=SourceResponse)
def update_source(source_id: int, source_data: SourceCreate, db: Session = Depends(get_db)):
    """Cập nhật thông tin nguồn cào."""
    source = db.query(models.ScrapedSource).filter(models.ScrapedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguồn")
    
    # Kiểm tra URL trùng lặp (ngoại trừ chính nó)
    existing = db.query(models.ScrapedSource).filter(models.ScrapedSource.url == source_data.url, models.ScrapedSource.id != source_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="URL nguồn này đã tồn tại ở một cấu hình khác!")
        
    source.name = source_data.name
    source.url = source_data.url
    source.limit = source_data.limit
    source.frequency = source_data.frequency
    source.location = source_data.location
    source.auto_post = source_data.auto_post
    source.start_post_time = source_data.start_post_time
    source.post_interval_minutes = source_data.post_interval_minutes
    
    db.commit()
    db.refresh(source)
    return _source_to_dict(source)


@app.post("/api/sources/{source_id}/run")
def run_source_now(source_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Cào ngay lập tức từ nguồn này."""
    source = db.query(models.ScrapedSource).filter(models.ScrapedSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguồn")
    # Cập nhật last_run_at
    source.last_run_at = datetime.datetime.now()
    db.commit()
    # Chạy cào trong background với location của nguồn
    background_tasks.add_task(scrape_job, source.url, source.limit, source.auto_post, source.start_post_time, source.post_interval_minutes)
    
    # Update start_post_time for next scheduled run (if it's recurring)
    if source.start_post_time:
        source.start_post_time += datetime.timedelta(days=1)
        db.commit()
        
    return {"status": "success", "message": f"Đang cào từ {source.name}..."}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
