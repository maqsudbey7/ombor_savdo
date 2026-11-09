"""Vercel Python funksiyasi: /api/* so'rovlari shu yerga keladi va FastAPI ilovasiga uzatiladi."""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402,F401  (Vercel `app` o'zgaruvchisini qidiradi)

# Serverless'da lifespan har doim ishlamasligi mumkin — jadvallarni shu yerda tayyorlaymiz.
try:
    init_db()
except Exception:  # baza vaqtincha ishlamasa ham ilova yuklansin, xato logda ko'rinadi
    logging.exception("Bazani tayyorlashda xatolik (DATABASE_URL ni tekshiring)")
