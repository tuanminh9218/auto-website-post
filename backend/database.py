import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

def _build_engine():
    """
    Tạo SQLAlchemy engine:
    - Cloud Run: dùng Cloud SQL Connector (unix socket) qua DATABASE_URL
    - Local dev: dùng SQLite
    """
    db_url = os.environ.get("DATABASE_URL", "")
    cloud_sql_conn = os.environ.get("CLOUD_SQL_CONNECTION_NAME", "")

    # Cloud SQL PostgreSQL via connector
    if cloud_sql_conn and db_url.startswith("postgresql"):
        from google.cloud.sql.connector import Connector
        import pg8000

        connector = Connector()

        def getconn():
            db_user = os.environ.get("DB_USER", "autoposter")
            db_pass = os.environ.get("DB_PASS", "")
            db_name = os.environ.get("DB_NAME", "autoposter")
            return connector.connect(
                cloud_sql_conn,
                "pg8000",
                user=db_user,
                password=db_pass,
                db=db_name,
            )

        engine = create_engine(
            "postgresql+pg8000://",
            creator=getconn,
            pool_size=5,
            max_overflow=2,
            pool_timeout=30,
            pool_recycle=1800,
        )
        print(f"[DB] Using Cloud SQL PostgreSQL: {cloud_sql_conn}")
        return engine

    # Fallback: SQLite for local development
    sqlite_path = db_url if db_url.startswith("sqlite") else "sqlite:////tmp/autoposter.db"
    print(f"[DB] Using SQLite: {sqlite_path}")
    engine = create_engine(sqlite_path, connect_args={"check_same_thread": False})
    return engine


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
