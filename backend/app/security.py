from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .i18n import http_error
from .database import get_db
from .models import User, Warehouse

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user: User) -> str:
    payload = {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> User:
    if creds is None:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "login_required")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        user = None
    if user is None:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "session_expired")
    return user


def get_warehouse(
    warehouse_id: int = Path(description="Ombor ID"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Warehouse:
    """Faqat egasi o'z omboriga kira oladi — boshqa birovniki 404 qaytaradi."""
    wh = db.get(Warehouse, warehouse_id)
    if wh is None or wh.owner_id != user.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "warehouse_not_found")
    return wh
