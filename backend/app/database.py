import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

# Vercel (serverless) da har bir so'rov qisqa yashaydi — ulanishlar pool'da saqlanmaydi.
_serverless = bool(os.getenv("VERCEL"))
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    **({"poolclass": NullPool} if _serverless else {}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Jadvallarni yaratadi va bo'sh bazaga demo ma'lumot qo'shadi."""
    from . import models  # noqa: F401  (modellar Base.metadata'ga yozilishi uchun)
    from .seed import seed

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
