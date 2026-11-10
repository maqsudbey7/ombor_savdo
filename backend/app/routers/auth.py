"""Ro'yxatdan o'tish, kirish va hisob xavfsizligi.

- Parollar faqat bcrypt xeshi ko'rinishida saqlanadi (asl parolni hech kim — hatto admin ham — ko'ra olmaydi).
- Kirishda parolni terib topishga qarshi cheklov: bitta raqamga 15 daqiqada 5 ta, bitta IP'ga 20 ta xato urinish.
- Parol o'zgarsa yoki "barcha qurilmalardan chiqish" bosilsa, eski tokenlar darhol yaroqsiz bo'ladi.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..i18n import http_error
from ..models import Customer, LoginAttempt, Movement, Product, User, Warehouse
from ..schemas import (LoginIn, PasswordChangeIn, PasswordConfirmIn, ProfileIn, RegisterIn, TokenOut, UserOut)
from ..security import create_token, get_current_user, hash_password, password_ok, verify_password
from ..seed import reset_demo_if_due

router = APIRouter(prefix="/auth", tags=["Auth"])

WINDOW = timedelta(minutes=15)
MAX_PER_PHONE = 5
MAX_PER_IP = 20


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
    return (ip or "unknown")[:64]


def is_demo(user: User) -> bool:
    return user.phone == settings.demo_phone


def token_out(user: User) -> TokenOut:
    return TokenOut(access_token=create_token(user), user=UserOut.model_validate(user))


def check_rate_limit(db: Session, phone: str, ip: str) -> None:
    since = datetime.now(timezone.utc) - WINDOW
    failed = (LoginAttempt.success.is_(False)) & (LoginAttempt.at >= since)
    by_phone = db.scalar(select(func.count()).where(failed, LoginAttempt.phone == phone)) or 0
    by_ip = db.scalar(select(func.count()).where(failed, LoginAttempt.ip == ip)) or 0
    if by_phone >= MAX_PER_PHONE or by_ip >= MAX_PER_IP:
        first = db.scalar(select(func.min(LoginAttempt.at)).where(
            failed, (LoginAttempt.phone == phone) if by_phone >= MAX_PER_PHONE else (LoginAttempt.ip == ip)))
        wait = WINDOW - (datetime.now(timezone.utc) - first) if first else WINDOW
        minutes = max(1, int(wait.total_seconds() // 60) + 1)
        raise http_error(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_attempts", m=minutes)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if not password_ok(data.password):
        raise http_error(422, "weak_password")
    if db.scalar(select(User).where(User.phone == data.phone)):
        raise http_error(status.HTTP_409_CONFLICT, "phone_taken")
    user = User(name=data.name.strip(), phone=data.phone, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    return token_out(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    check_rate_limit(db, data.phone, ip)
    user = db.scalar(select(User).where(User.phone == data.phone))
    ok = bool(user) and verify_password(data.password, user.password_hash)
    db.add(LoginAttempt(phone=data.phone, ip=ip, success=ok))
    # Eski yozuvlarni tozalab turamiz (jadval o'sib ketmasin)
    db.execute(delete(LoginAttempt).where(LoginAttempt.at < datetime.now(timezone.utc) - timedelta(days=2)))
    if ok:
        # Muvaffaqiyatli kirishdan keyin shu raqamning xato urinishlari hisobdan chiqadi
        db.execute(delete(LoginAttempt).where(LoginAttempt.phone == data.phone, LoginAttempt.success.is_(False)))
    db.commit()
    if not ok:
        raise http_error(status.HTTP_401_UNAUTHORIZED, "bad_credentials")
    reset_demo_if_due(db, user)
    db.refresh(user)
    return token_out(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_profile(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    user.name = data.name.strip()
    db.commit()
    return user


@router.post("/password", response_model=TokenOut)
def change_password(data: PasswordChangeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Parolni almashtirish. Boshqa qurilmalardagi kirishlar bekor bo'ladi, shu qurilmaga yangi token qaytadi."""
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    if not verify_password(data.current_password, user.password_hash):
        raise http_error(status.HTTP_400_BAD_REQUEST, "wrong_password")
    if not password_ok(data.new_password):
        raise http_error(422, "weak_password")
    if data.current_password == data.new_password:
        raise http_error(status.HTTP_400_BAD_REQUEST, "same_password")
    user.password_hash = hash_password(data.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return token_out(user)


@router.post("/logout-all", response_model=TokenOut)
def logout_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Barcha qurilmalardan chiqish (telefon yo'qolsa). Shu qurilma yangi token bilan qoladi."""
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return token_out(user)


def _iso(v):
    return v.isoformat() if v is not None else None


@router.get("/export")
def export_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Barcha ma'lumotlarning zaxira nusxasi (JSON fayl)."""
    whs = db.scalars(select(Warehouse).where(Warehouse.owner_id == user.id).order_by(Warehouse.id)).all()
    out = {
        "app": "OmborSavdo", "version": 1, "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {"name": user.name, "phone": user.phone, "created_at": _iso(user.created_at)},
        "warehouses": [],
    }
    for w in whs:
        products = db.scalars(select(Product).where(Product.warehouse_id == w.id).order_by(Product.id)).all()
        movements = db.scalars(select(Movement).where(Movement.warehouse_id == w.id).order_by(Movement.id)).all()
        customers = db.scalars(select(Customer).where(Customer.warehouse_id == w.id).order_by(Customer.id)).all()
        out["warehouses"].append({
            "name": w.name, "address": w.address, "description": w.description, "color": w.color,
            "created_at": _iso(w.created_at),
            "categories": [{"name": c.name, "color": c.color} for c in w.categories],
            "products": [{
                "name": p.name, "sku": p.sku, "category": p.category.name if p.category else None, "unit": p.unit,
                "cost_price": p.cost_price, "sale_price": p.sale_price, "quantity": p.quantity,
                "min_quantity": p.min_quantity, "location": p.location, "description": p.description,
            } for p in products],
            "movements": [{
                "type": m.type.value, "product": m.product_name, "unit": m.unit, "quantity": m.quantity,
                "delta": m.delta, "balance_after": m.balance_after, "price": m.price,
                "counterparty": m.counterparty, "note": m.note, "created_at": _iso(m.created_at),
            } for m in movements],
            "customers": [{
                "name": c.name, "phone": c.phone, "note": c.note,
                "debts": [{
                    "description": d.description, "amount": d.amount, "paid_amount": d.paid_amount,
                    "given_date": _iso(d.given_date), "due_date": _iso(d.due_date), "note": d.note,
                    "payments": [{"amount": p.amount, "note": p.note, "paid_at": _iso(p.paid_at)} for p in d.payments],
                } for d in c.debts],
            } for c in customers],
        })
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return JSONResponse(out, headers={"Content-Disposition": f'attachment; filename="ombor-zaxira-{stamp}.json"'})


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: PasswordConfirmIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Hisobni va unga tegishli barcha ma'lumotlarni butunlay o'chirish (parol bilan tasdiqlanadi)."""
    if is_demo(user):
        raise http_error(status.HTTP_403_FORBIDDEN, "demo_forbidden")
    if not verify_password(data.password, user.password_hash):
        raise http_error(status.HTTP_400_BAD_REQUEST, "wrong_password")
    db.delete(user)
    db.commit()
