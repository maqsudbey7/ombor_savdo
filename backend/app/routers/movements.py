from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..i18n import http_error
from ..models import Debt, Movement, MovementType, Product, User, Warehouse
from ..schemas import MovementIn, MovementOut
from ..security import get_current_user, get_warehouse
from ..timeutil import today
from .debts import resolve_customer

router = APIRouter(prefix="/warehouses/{warehouse_id}/movements", tags=["Kirim-chiqim"])


@router.get("", response_model=list[MovementOut])
def list_movements(
    type: MovementType | None = None,
    product_id: int | None = None,
    limit: int = Query(200, ge=1, le=1000),
    wh: Warehouse = Depends(get_warehouse),
    db: Session = Depends(get_db),
):
    stmt = select(Movement).where(Movement.warehouse_id == wh.id)
    if type:
        stmt = stmt.where(Movement.type == type)
    if product_id:
        stmt = stmt.where(Movement.product_id == product_id)
    return db.scalars(stmt.order_by(Movement.created_at.desc(), Movement.id.desc()).limit(limit)).all()


@router.post("", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(data: MovementIn, wh: Warehouse = Depends(get_warehouse),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.debt and data.type != MovementType.outgoing:
        raise http_error(status.HTTP_400_BAD_REQUEST, "debt_only_out")

    # Mahsulot qatorini bloklaymiz — bir vaqtdagi ikki chiqim qoldiqni manfiy qila olmaydi.
    p = db.scalar(
        select(Product).where(Product.id == data.product_id, Product.warehouse_id == wh.id).with_for_update(of=Product)
    )
    if p is None:
        raise http_error(status.HTTP_404_NOT_FOUND, "product_not_found")

    if data.type == MovementType.adjust:
        delta = data.quantity - p.quantity
    else:
        if data.quantity <= 0:
            raise http_error(status.HTTP_400_BAD_REQUEST, "qty_positive")
        delta = data.quantity if data.type == MovementType.incoming else -data.quantity
    if p.quantity + delta < 0:
        raise http_error(status.HTTP_409_CONFLICT, "not_enough_stock", qty=p.quantity, unit=p.unit)

    default_price = p.sale_price if data.type == MovementType.outgoing else p.cost_price
    price = default_price if data.price is None else data.price
    counterparty = data.counterparty.strip()

    customer = None
    if data.debt:
        if data.quantity * price <= 0:
            raise http_error(status.HTTP_400_BAD_REQUEST, "debt_zero_sum")
        customer = resolve_customer(db, wh, data.debt.customer_id, data.debt.customer_name, data.debt.customer_phone)
        counterparty = counterparty or customer.name

    p.quantity += delta
    m = Movement(warehouse_id=wh.id, product_id=p.id, user_id=user.id, type=data.type, product_name=p.name, unit=p.unit,
                 quantity=data.quantity, delta=delta, balance_after=p.quantity, price=price,
                 counterparty=counterparty, note=data.note.strip())
    db.add(m)

    # Qarzga berilgan bo'lsa — qarz shu tranzaksiyada yoziladi (yoki ikkalasi ham yozilmaydi)
    if customer is not None:
        db.flush()
        db.add(Debt(warehouse_id=wh.id, customer_id=customer.id, movement_id=m.id,
                    description=f"{p.name} — {data.quantity} {p.unit}", amount=data.quantity * price,
                    given_date=today(), due_date=data.debt.due_date, note=data.note.strip()))
    db.commit()
    db.refresh(m)
    return m
