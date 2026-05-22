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
    location = Column(String, default="Tin tức sự kiện")
    scheduled_time = Column(DateTime, nullable=True)
    status = Column(String, default="pending")  # pending, published, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)


class ScrapedSource(Base):
    __tablename__ = "scraped_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False, unique=True)
    limit = Column(Integer, default=2)
    frequency = Column(String, default="Mỗi 2 tiếng")
    location = Column(String, default="Tin tức sự kiện")
    auto_post = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    start_post_time = Column(DateTime, nullable=True)
    post_interval_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_run_at = Column(DateTime, nullable=True)


class User(Base):
    """Người dùng đăng nhập bằng Google OAuth."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    # role: admin | editor | viewer
    role = Column(String, default="viewer")
    # Admin phải approve trước khi user dùng được (trừ admin chính)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
