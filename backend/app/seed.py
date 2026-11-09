"""Namuna ma'lumotlar: demo hisob va yangi omborni to'ldirish uchun."""
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .models import Category, Movement, MovementType, Product, User, Warehouse
from .security import hash_password

SAMPLE_CATEGORIES = [
    ("Oziq-ovqat", "amber"), ("Ichimliklar", "cyan"), ("Maishiy kimyo", "violet"),
    ("Qurilish mollari", "orange"), ("Elektr jihozlar", "blue"),
]

# name, sku, category, unit, cost, sale, qty, min_qty, location
SAMPLE_PRODUCTS = [
    ('Guruch "Lazer" 25 kg', "OZ-001", "Oziq-ovqat", "qop", 470000, 520000, 120, 30, "A-1"),
    ("Shakar 50 kg", "OZ-002", "Oziq-ovqat", "qop", 560000, 610000, 64, 20, "A-2"),
    ("Kungaboqar yog‘i 5 L", "OZ-003", "Oziq-ovqat", "quti", 300000, 336000, 18, 25, "A-3"),
    ("Makaron 400 g (20 ta)", "OZ-004", "Oziq-ovqat", "quti", 118000, 140000, 210, 40, "A-4"),
    ("Un oliy nav 50 kg", "OZ-005", "Oziq-ovqat", "qop", 340000, 380000, 0, 15, "A-5"),
    ("Mineral suv 1.5 L (6 ta)", "IC-001", "Ichimliklar", "blok", 21000, 27000, 540, 100, "B-1"),
    ("Gazli ichimlik 1 L (12 ta)", "IC-002", "Ichimliklar", "blok", 84000, 102000, 96, 50, "B-2"),
    ("Ko‘k choy 100 g (50 ta)", "IC-003", "Ichimliklar", "quti", 400000, 450000, 7, 10, "B-3"),
    ("Kir yuvish kukuni 3 kg (4 ta)", "MK-001", "Maishiy kimyo", "quti", 225000, 260000, 75, 20, "C-1"),
    ("Idish yuvish vositasi 1 L (12 ta)", "MK-002", "Maishiy kimyo", "quti", 140000, 168000, 44, 15, "C-2"),
    ("Sement M400 50 kg", "QR-001", "Qurilish mollari", "qop", 54000, 62000, 860, 200, "D-1"),
    ("Gipsokarton 12.5 mm", "QR-002", "Qurilish mollari", "list", 59000, 68000, 140, 150, "D-2"),
    ("LED lampa 12W (100 ta)", "EL-001", "Elektr jihozlar", "quti", 780000, 900000, 26, 5, "E-1"),
    ("Kabel VVG 3×2.5 (100 m)", "EL-002", "Elektr jihozlar", "buxta", 1300000, 1450000, 12, 4, "E-2"),
]

SUPPLIERS = ["Agro Trade MChJ", "Sharq Distribyutsiya", "Toshkent Ulgurji", "Qurilish Market", "Elektro Servis"]
CUSTOMERS = ["Baraka do‘koni", "Oila market", "Chilonzor savdo", "Yunusobod minimarket", "Qurilish ustasi Akmal"]


def fill_warehouse(db: Session, wh: Warehouse, user: User, products=SAMPLE_PRODUCTS, history_days: int = 0) -> None:
    """Omborga namuna kategoriya va mahsulotlarni qo'shadi; history_days>0 bo'lsa harakatlar tarixi ham yaratiladi."""
    rnd = random.Random(wh.name)
    cats = {}
    for name, color in SAMPLE_CATEGORIES:
        if any(p[2] == name for p in products):
            cats[name] = Category(warehouse=wh, name=name, color=color)
    now = datetime.now(timezone.utc)
    for name, sku, cat, unit, cost, sale, qty, min_qty, loc in products:
        p = Product(warehouse=wh, category=cats[cat], name=name, sku=sku, unit=unit, cost_price=cost,
                    sale_price=sale, quantity=0, min_quantity=min_qty, location=loc)
        db.add(p)
        events: list[tuple[datetime, MovementType, int]] = []
        if history_days:
            # Tarix: boshida katta kirim, keyin har xil kunlarda kirim/chiqimlar, oxirida qoldiq = qty
            outs = [rnd.randint(1, max(2, qty // 6 + 3)) for _ in range(rnd.randint(3, 7))]
            ins = [rnd.randint(1, max(2, qty // 5 + 3)) for _ in range(rnd.randint(1, 3))]
            start = qty + sum(outs) - sum(ins)
            if start <= 0:
                ins, start = [], qty + sum(outs)
            events.append((now - timedelta(days=history_days, hours=rnd.randint(0, 5)), MovementType.incoming, start))
            for q in ins:
                events.append((now - timedelta(days=rnd.randint(1, history_days - 1), hours=rnd.randint(0, 9)), MovementType.incoming, q))
            for q in outs:
                events.append((now - timedelta(days=rnd.randint(0, history_days - 1), hours=rnd.randint(0, 9)), MovementType.outgoing, q))
            events.sort(key=lambda e: e[0])
        elif qty:
            events.append((now, MovementType.incoming, qty))
        balance = 0
        for at, typ, q in events:
            if typ == MovementType.outgoing:
                q = min(q, balance)
                if not q:
                    continue
            delta = q if typ == MovementType.incoming else -q
            balance += delta
            db.add(Movement(warehouse=wh, product=p, user_id=user.id, type=typ, product_name=name, unit=unit,
                            quantity=q, delta=delta, balance_after=balance,
                            price=cost if typ == MovementType.incoming else sale,
                            counterparty=rnd.choice(SUPPLIERS if typ == MovementType.incoming else CUSTOMERS),
                            note="Boshlang‘ich qoldiq" if not history_days else "", created_at=at))
        p.quantity = balance


def seed_demo(db: Session) -> None:
    """Bo'sh bazaga demo hisob qo'shadi: 2 ta ombor, 14 kunlik harakatlar tarixi bilan."""
    if db.scalar(select(User.id).limit(1)):
        return
    try:
        user = User(name="Demo foydalanuvchi", phone=settings.demo_phone, password_hash=hash_password(settings.demo_password))
        main = Warehouse(owner=user, name="Chilonzor markaziy ombori", address="Toshkent sh., Chilonzor tumani",
                         description="Asosiy ulgurji ombor", color="blue")
        branch = Warehouse(owner=user, name="Sergeli filiali", address="Toshkent sh., Sergeli tumani",
                           description="Qurilish mollari ombori", color="emerald")
        db.add_all([user, main, branch])
        db.flush()
        fill_warehouse(db, main, user, history_days=14)
        fill_warehouse(db, branch, user, products=[p for p in SAMPLE_PRODUCTS if p[2] == "Qurilish mollari"], history_days=10)
        db.commit()
    except IntegrityError:  # bir vaqtda ikkita serverless nusxa seed qilsa
        db.rollback()
