from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Cloud Run: dùng /tmp cho SQLite (persistent trong session, nhưng sẽ reset khi container restart)
# Nếu muốn data persistent, cần migrate sang Cloud SQL PostgreSQL
DB_PATH = os.environ.get("DATABASE_URL", "sqlite:////tmp/autoposter.db")

# Nếu DATABASE_URL không bắt đầu bằng sqlite, dùng nguyên giá trị (cho PostgreSQL/MySQL)
# Ngược lại, đảm bảo SQLite path đúng
if DB_PATH.startswith("sqlite"):
    SQLALCHEMY_DATABASE_URL = DB_PATH
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL (Cloud SQL) - cần psycopg2
    SQLALCHEMY_DATABASE_URL = DB_PATH
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
