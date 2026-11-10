"""Qarzdorlik: mijozlar, qarzlar, to'lovlar va muddat eslatmalari."""
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..i18n import http_error
from ..models import Customer, Debt, DebtPayment, User, Warehouse
from ..schemas import (CustomerIn, CustomerOut, DebtCreate, DebtOut, DebtSummary, DebtUpdate, NotificationOut,
                       PaymentIn)
from ..security import get_current_user, get_warehouse
from ..timeutil import today

SOON_DAYS = 3  # shuncha kun qolganda "muddati yaqin" hisoblanadi

customers_router = APIRouter(prefix="/warehouses/{warehouse_id}/customers", tags=["Qarzdorlik"])
debts_router = APIRouter(prefix="/warehouses/{warehouse_id}/debts", tags=["Qarzdorlik"])
notifications_router = APIRouter(tags=["Qarzdorlik"])


# ---------- Yordamchilar ----------
def debt_status(d: Debt, t: date) -> tuple[str, int | None]:
    days = (d.due_date - t).days if d.due_date else None
    if d.paid_amount >= d.amount:
        return "paid", days
    if days is None:
        return "open", None
    if days < 0:
        return "overdue", days
    if days == 0:
        return "due_today", days
    if days <= SOON_DAYS:
        return "due_soon", days
    return "open", days


def debt_out(d: Debt, t: date | None = None) -> DebtOut:
    st, days = debt_status(d, t or today())
    return DebtOut.model_validate({
        "id": d.id, "customer": d.customer, "description": d.description, "amount": d.amount,
        "paid_amount": d.paid_amount, "remaining": d.remaining, "given_date": d.given_date, "due_date": d.due_date,
        "status": st, "days_left": days, "note": d.note, "reminded_at": d.reminded_at, "movement_id": d.movement_id,
        "created_at": d.created_at, "payments": d.payments,
    })


def customer_out(c: Customer, t: date) -> CustomerOut:
    unpaid = [d for d in c.debts if d.paid_amount < d.amount]
    dues = [d.due_date for d in unpaid if d.due_date]
    return CustomerOut(
        id=c.id, name=c.name, phone=c.phone, note=c.note, created_at=c.created_at,
        total=sum(d.amount for d in c.debts), paid=sum(d.paid_amount for d in c.debts),
        remaining=sum(d.remaining for d in unpaid), open_count=len(unpaid),
        overdue_count=sum(1 for d in unpaid if d.due_date and d.due_date < t),
        next_due=min(dues) if dues else None,
    )


def get_customer(customer_id: int, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)) -> Customer:
    c = db.get(Customer, customer_id)
    if c is None or c.warehouse_id != wh.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "customer_not_found")
    return c


def get_debt(debt_id: int, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)) -> Debt:
    d = db.get(Debt, debt_id)
    if d is None or d.warehouse_id != wh.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "debt_not_found")
    return d


def resolve_customer(db: Session, wh: Warehouse, customer_id: int | None, name: str | None, phone: str | None) -> Customer:
    """Mavjud mijozni topadi yoki yangisini yaratadi (telefon bo'yicha takrorlanmaydi)."""
    if customer_id:
        c = db.get(Customer, customer_id)
        if c is None or c.warehouse_id != wh.id:
            raise http_error(status.HTTP_404_NOT_FOUND, "customer_not_found")
        return c
    name = (name or "").strip()
    if not name:
        raise http_error(status.HTTP_400_BAD_REQUEST, "customer_required")
    if phone:
        existing = db.scalar(select(Customer).where(Customer.warehouse_id == wh.id, Customer.phone == phone))
        if existing:
            return existing
    c = Customer(warehouse_id=wh.id, name=name, phone=phone or "")
    db.add(c)
    db.flush()
    return c


# ---------- Mijozlar ----------
@customers_router.get("", response_model=list[CustomerOut])
def list_customers(q: str | None = None, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    stmt = select(Customer).where(Customer.warehouse_id == wh.id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.phone.ilike(like)))
    t = today()
    rows = [customer_out(c, t) for c in db.scalars(stmt).unique()]
    # Avval qarzi borlar (ko'pi tepada), keyin qarzsizlar
    return sorted(rows, key=lambda c: (c.remaining == 0, -c.overdue_count, -c.remaining, c.name.lower()))


@customers_router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerIn, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    c = Customer(warehouse_id=wh.id, name=data.name.strip(), phone=data.phone, note=data.note)
    db.add(c)
    db.commit()
    return customer_out(c, today())


@customers_router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(data: CustomerIn, c: Customer = Depends(get_customer), db: Session = Depends(get_db)):
    c.name, c.phone, c.note = data.name.strip(), data.phone, data.note
    db.commit()
    return customer_out(c, today())


@customers_router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(c: Customer = Depends(get_customer), db: Session = Depends(get_db)):
    db.delete(c)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Qarzlar ----------
@debts_router.get("/summary", response_model=DebtSummary)
def summary(wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    t = today()
    unpaid = db.scalars(select(Debt).where(Debt.warehouse_id == wh.id, Debt.paid_amount < Debt.amount)).unique().all()
    since = datetime.now(timezone.utc) - timedelta(days=30)
    collected = db.scalar(
        select(func.coalesce(func.sum(DebtPayment.amount), 0)).join(Debt)
        .where(Debt.warehouse_id == wh.id, DebtPayment.paid_at >= since)
    )
    overdue = [d for d in unpaid if d.due_date and d.due_date < t]
    return DebtSummary(
        outstanding=sum(d.remaining for d in unpaid),
        overdue_amount=sum(d.remaining for d in overdue), overdue_count=len(overdue),
        due_today_count=sum(1 for d in unpaid if d.due_date == t),
        due_soon_count=sum(1 for d in unpaid if d.due_date and 0 < (d.due_date - t).days <= SOON_DAYS),
        debtors_count=len({d.customer_id for d in unpaid}), collected_30d=collected,
    )


@debts_router.get("", response_model=list[DebtOut])
def list_debts(
    filter: str = Query("open", pattern="^(open|overdue|soon|paid|all)$",
                        description="open — to'lanmagan, overdue — muddati o'tgan, soon — bugun/3 kun ichida, paid — to'langan"),
    customer_id: int | None = None,
    q: str | None = None,
    wh: Warehouse = Depends(get_warehouse),
    db: Session = Depends(get_db),
):
    t = today()
    unpaid = Debt.paid_amount < Debt.amount
    stmt = select(Debt).join(Customer).where(Debt.warehouse_id == wh.id)
    if filter == "open":
        stmt = stmt.where(unpaid)
    elif filter == "overdue":
        stmt = stmt.where(unpaid, Debt.due_date < t)
    elif filter == "soon":
        stmt = stmt.where(unpaid, and_(Debt.due_date >= t, Debt.due_date <= t + timedelta(days=SOON_DAYS)))
    elif filter == "paid":
        stmt = stmt.where(~unpaid)
    if customer_id:
        stmt = stmt.where(Debt.customer_id == customer_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(like), Customer.phone.ilike(like), Debt.description.ilike(like)))
    if filter == "paid":
        stmt = stmt.order_by(Debt.given_date.desc(), Debt.id.desc())
    else:
        stmt = stmt.order_by(Debt.due_date.asc().nulls_last(), Debt.given_date, Debt.id)
    return [debt_out(d, t) for d in db.scalars(stmt.limit(500)).unique()]


@debts_router.post("", response_model=DebtOut, status_code=status.HTTP_201_CREATED)
def create_debt(data: DebtCreate, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    c = resolve_customer(db, wh, data.customer_id, data.customer_name, data.customer_phone)
    d = Debt(warehouse_id=wh.id, customer_id=c.id, description=data.description.strip(), amount=data.amount,
             given_date=data.given_date, due_date=data.due_date, note=data.note)
    db.add(d)
    db.commit()
    db.refresh(d)
    return debt_out(d)


@debts_router.get("/{debt_id}", response_model=DebtOut)
def get_one(d: Debt = Depends(get_debt)):
    return debt_out(d)


@debts_router.put("/{debt_id}", response_model=DebtOut)
def update_debt(data: DebtUpdate, d: Debt = Depends(get_debt), db: Session = Depends(get_db)):
    if data.amount < d.paid_amount:
        raise http_error(status.HTTP_400_BAD_REQUEST, "amount_below_paid", paid=f"{d.paid_amount:,}".replace(",", " "))
    for k, v in data.model_dump().items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return debt_out(d)


@debts_router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_debt(d: Debt = Depends(get_debt), db: Session = Depends(get_db)):
    db.delete(d)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@debts_router.post("/{debt_id}/payments", response_model=DebtOut, status_code=status.HTTP_201_CREATED)
def add_payment(data: PaymentIn, debt_id: int, wh: Warehouse = Depends(get_warehouse),
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Qatorni bloklaymiz — ikki kishi bir vaqtda to'lov kiritsa ham ortiqcha yozilmaydi
    d = db.scalar(select(Debt).where(Debt.id == debt_id, Debt.warehouse_id == wh.id).with_for_update(of=Debt))
    if d is None:
        raise http_error(status.HTTP_404_NOT_FOUND, "debt_not_found")
    if d.remaining <= 0:
        raise http_error(status.HTTP_409_CONFLICT, "debt_already_paid")
    if data.amount > d.remaining:
        raise http_error(status.HTTP_409_CONFLICT, "payment_too_much", rest=f"{d.remaining:,}".replace(",", " "))
    d.payments.append(DebtPayment(amount=data.amount, note=data.note.strip(), user_id=user.id))
    d.paid_amount += data.amount
    db.commit()
    db.refresh(d)
    return debt_out(d)


@debts_router.delete("/{debt_id}/payments/{payment_id}", response_model=DebtOut)
def delete_payment(payment_id: int, d: Debt = Depends(get_debt), db: Session = Depends(get_db)):
    p = db.get(DebtPayment, payment_id)
    if p is None or p.debt_id != d.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "payment_not_found")
    d.paid_amount -= p.amount
    db.delete(p)
    db.commit()
    db.refresh(d)
    return debt_out(d)


@debts_router.post("/{debt_id}/remind", response_model=DebtOut)
def mark_reminded(d: Debt = Depends(get_debt), db: Session = Depends(get_db)):
    """Mijozga eslatma yuborilganini belgilash (SMS / WhatsApp / Telegram orqali)."""
    d.reminded_at = datetime.now(timezone.utc)
    db.commit()
    return debt_out(d)


# ---------- Bildirishnomalar (barcha omborlar bo'yicha) ----------
@notifications_router.get("/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Muddati o'tgan, bugun yoki 3 kun ichida tugaydigan to'lanmagan qarzlar."""
    t = today()
    rows = db.execute(
        select(Debt, Warehouse.name).join(Warehouse, Warehouse.id == Debt.warehouse_id)
        .where(Warehouse.owner_id == user.id, Debt.paid_amount < Debt.amount,
               Debt.due_date.is_not(None), Debt.due_date <= t + timedelta(days=SOON_DAYS))
        .order_by(Debt.due_date, Debt.id).limit(100)
    ).unique().all()
    out = []
    for d, wh_name in rows:
        st, days = debt_status(d, t)
        out.append(NotificationOut(
            kind=st if st in ("overdue", "due_today") else "due_soon", warehouse_id=d.warehouse_id,
            warehouse_name=wh_name, debt_id=d.id, customer_id=d.customer_id, customer_name=d.customer.name,
            customer_phone=d.customer.phone, description=d.description, remaining=d.remaining,
            due_date=d.due_date, days_left=days,
        ))
    return out
