from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import Category, PriceTier, Product, Role, User
from .security import hash_password

CATEGORIES = [
    ("Oziq-ovqat", "oziq-ovqat", "🥫"), ("Ichimliklar", "ichimliklar", "🥤"), ("Maishiy kimyo", "maishiy-kimyo", "🧴"),
    ("Gigiyena", "gigiyena", "🧻"), ("Qurilish mollari", "qurilish", "🧱"), ("Elektr jihozlar", "elektr", "💡"),
]

# name, sku, description, category, unit, pack_size, stock, moq, base_price, [(min_qty, price)]
PRODUCTS = [
    ('Guruch "Lazer" 25 kg', "OZ-001", "Yuqori navli lazer guruchi, qop 25 kg.", "oziq-ovqat", "qop", 1, 420, 5, 520000, [(20, 505000), (50, 490000)]),
    ("Shakar 50 kg", "OZ-002", "Oq kristall shakar, qop 50 kg.", "oziq-ovqat", "qop", 1, 300, 2, 610000, [(10, 595000), (40, 580000)]),
    ("Kungaboqar yog‘i 5 L", "OZ-003", "Tozalangan kungaboqar yog‘i. Qutida 4 ta.", "oziq-ovqat", "quti", 4, 800, 3, 336000, [(15, 324000), (60, 312000)]),
    ("Makaron 400 g", "OZ-004", "Qattiq bug‘doy makaroni. Qutida 20 ta.", "oziq-ovqat", "quti", 20, 1200, 5, 140000, [(30, 132000), (100, 125000)]),
    ("Mineral suv 1.5 L", "IC-001", "Gazsiz mineral suv. Blokda 6 ta.", "ichimliklar", "blok", 6, 3000, 10, 27000, [(50, 25200), (200, 23400)]),
    ("Gazli ichimlik 1 L", "IC-002", "Turli ta’mlar. Blokda 12 ta.", "ichimliklar", "blok", 12, 1500, 5, 102000, [(40, 96000), (150, 90000)]),
    ("Ko‘k choy 100 g", "IC-003", "Ko‘k choy №95. Qutida 50 ta.", "ichimliklar", "quti", 50, 400, 2, 450000, [(10, 430000)]),
    ("Kir yuvish kukuni 3 kg", "MK-001", "Avtomat mashinalar uchun. Qutida 4 ta.", "maishiy-kimyo", "quti", 4, 500, 3, 260000, [(20, 248000), (80, 236000)]),
    ("Idish yuvish vositasi 1 L", "MK-002", "Limon hidli. Qutida 12 ta.", "maishiy-kimyo", "quti", 12, 650, 3, 168000, [(25, 158000)]),
    ("Oqartiruvchi 1 L", "MK-003", "Xlorli oqartiruvchi. Qutida 15 ta.", "maishiy-kimyo", "quti", 15, 0, 2, 120000, []),
    ("Hojatxona qog‘ozi", "GG-001", "3 qatlamli. Qopda 48 rulon.", "gigiyena", "qop", 48, 900, 5, 168000, [(30, 158000), (100, 150000)]),
    ("Suyuq sovun 500 ml", "GG-002", "Antibakterial. Qutida 24 ta.", "gigiyena", "quti", 24, 350, 2, 216000, [(15, 204000)]),
    ("Sement M400 50 kg", "QR-001", "Portlandsement M400, qop 50 kg.", "qurilish", "qop", 1, 2500, 20, 62000, [(100, 59000), (500, 56000)]),
    ("Gipsokarton 12.5 mm", "QR-002", "Devor uchun gipsokarton list 1.2×2.5 m.", "qurilish", "list", 1, 1800, 20, 68000, [(100, 64000), (400, 61000)]),
    ("LED lampa 12W E27", "EL-001", "Issiq/sovuq yorug‘lik. Qutida 100 ta.", "elektr", "quti", 100, 260, 1, 900000, [(10, 850000), (30, 800000)]),
    ("Elektr kabel VVG 3×2.5", "EL-002", "Mis kabel, 100 m buxta.", "elektr", "buxta", 1, 140, 2, 1450000, [(10, 1390000)]),
]


def seed(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)):
        return
    print("Seeding demo data…")
    db.add(User(name="Administrator", phone=settings.admin_phone, company="Ombor Savdo",
                password_hash=hash_password(settings.admin_password), role=Role.admin))
    cats = {slug: Category(name=n, slug=slug, icon=i) for n, slug, i in CATEGORIES}
    db.add_all(cats.values())
    for name, sku, desc, cat, unit, pack, stock, moq, price, tiers in PRODUCTS:
        db.add(Product(name=name, sku=sku, description=desc, category=cats[cat], unit=unit, pack_size=pack,
                       stock=stock, moq=moq, base_price=price,
                       tiers=[PriceTier(min_qty=q, price=p) for q, p in tiers]))
    db.commit()
