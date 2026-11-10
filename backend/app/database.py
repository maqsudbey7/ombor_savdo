import logging
import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings

log = logging.getLogger("ombor")

# Vercel (serverless) da har bir chaqiruv qisqa yashaydi — ulanishlar pool'da saqlanmaydi.
_serverless = bool(os.getenv("VERCEL"))
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
    **({"poolclass": NullPool} if _serverless else {}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    ensure_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


_ready = False


def ensure_db() -> None:
    """Jadvallarni (bir marta) yaratadi va bo'sh bazaga demo ma'lumot qo'shadi.

    Xato bo'lsa ham ilovani yiqitmaydi — keyingi so'rovda yana urinib ko'radi.
    """
    global _ready
    if _ready:
        return
    from . import models  # noqa: F401
    from .seed import seed_demo, seed_demo_debts

    Base.metadata.create_all(engine)  # yangi jadvallar mavjud bazaga ham qo'shiladi (eskilariga tegilmaydi)
    run_migrations()
    with SessionLocal() as db:
        seed_demo(db)
        seed_demo_debts(db)
    _ready = True


# --- Migratsiyalar: mavjud jadvallarga yangi ustunlar qo'shish (ma'lumotlar o'chirilmaydi) ---
# Har bir qadam bir marta bajariladi va ombor_schema_migrations jadvalida belgilanadi.
# Faqat "qo'shish" turidagi, qayta ishga tushirsa ham zararsiz (IF NOT EXISTS) buyruqlar.
MIGRATIONS: list[tuple[int, str]] = [
    (1, "ALTER TABLE ombor_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"),
    (2, "ALTER TABLE ombor_users ADD COLUMN IF NOT EXISTS demo_reset_at TIMESTAMPTZ"),
]


def run_migrations() -> None:
    from sqlalchemy import text

    with engine.begin() as conn:
        # Bir vaqtda ikkita serverless nusxa migratsiya qilmasligi uchun qulf
        conn.execute(text("SELECT pg_advisory_xact_lock(724501)"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS ombor_schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"))
        done = {r[0] for r in conn.execute(text("SELECT version FROM ombor_schema_migrations"))}
        for version, sql in MIGRATIONS:
            if version not in done:
                conn.execute(text(sql))
                conn.execute(text("INSERT INTO ombor_schema_migrations (version) VALUES (:v)"), {"v": version})
                log.info("Migratsiya %s bajarildi", version)


def try_init_db() -> None:
    try:
        ensure_db()
    except Exception as e:  # noqa: BLE001
        log.error("Bazani tayyorlab bo'lmadi: %s", e)
