from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from database import Base
import datetime

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    short_desc = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    source_url = Column(String)
    location = Column(String, default="Tin tức sự kiện") # Menu đăng bài
    scheduled_time = Column(DateTime, nullable=True)
    status = Column(String, default="pending") # pending, published, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)

class ScrapedSource(Base):
    """Lưu các nguồn cào tự động được thêm từ Dashboard."""
    __tablename__ = "scraped_sources"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)               # Tên hiển thị
    url         = Column(String, nullable=False, unique=True)  # URL nguồn cào
    limit       = Column(Integer, default=2)                   # Số bài / lần chạy
    frequency   = Column(String, default="Mỗi 2 tiếng")      # Tần suất
    location    = Column(String, default="Tin tức sự kiện")  # Vị trí đăng bài
    auto_post   = Column(Boolean, default=False)               # Tự động đăng luôn?
    is_active   = Column(Boolean, default=True)                # Đang hoạt động?
    start_post_time = Column(DateTime, nullable=True)          # Thời gian bắt đầu đăng bài đầu tiên
    post_interval_minutes = Column(Integer, default=0)         # Khoảng cách giữa các bài (phút)
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)              # Lần cào gần nhất
