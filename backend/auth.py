"""
auth.py - Google OAuth verification + JWT session management
"""
import os
import datetime
from typing import Optional

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

import models
from database import get_db

# ── Config ────────────────────────────────────────────────────────────────────
ADMIN_EMAIL = "tuanminh9218@gmail.com"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "auto-post-secret-key-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)


# ── Google Token Verification ─────────────────────────────────────────────────
def verify_google_token(credential: str) -> dict:
    """
    Xác minh Google ID Token và trả về thông tin user.
    Returns: {"email": ..., "name": ..., "picture": ...}
    Raises: HTTPException 401 nếu token không hợp lệ
    """
    try:
        request = google_requests.Request()
        payload = google_id_token.verify_oauth2_token(
            credential,
            request,
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        return {
            "email": payload.get("email", ""),
            "name": payload.get("name", ""),
            "picture": payload.get("picture", ""),
            "email_verified": payload.get("email_verified", False),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token không hợp lệ: {str(e)}",
        )


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_jwt(email: str, role: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"sub": email, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


# ── Dependencies ──────────────────────────────────────────────────────────────
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency: Lấy user từ JWT token. Raise 401 nếu không hợp lệ."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")

    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token hết hạn hoặc không hợp lệ")

    email = payload.get("sub")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """Tương tự get_current_user nhưng trả None thay vì raise nếu chưa login."""
    if not credentials:
        return None
    payload = decode_jwt(credentials.credentials)
    if not payload:
        return None
    email = payload.get("sub")
    return db.query(models.User).filter(models.User.email == email).first()


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Dependency: Chỉ cho phép admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền này")
    return current_user
