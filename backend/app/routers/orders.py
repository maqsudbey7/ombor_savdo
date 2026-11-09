from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, User
from ..schemas import OrderIn, OrderOut
from ..security import get_current_user

router = APIRouter(prefix="/orders", tags=["Buyurtmalar"])


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(data: OrderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Merge duplicate lines, then lock product rows (SELECT ... FOR UPDATE) so two
    # simultaneous orders can never sell the same stock twice.
    qty_by_id: dict[int, int] = {}
    for it in data.items:
        qty_by_id[it.product_id] = qty_by_id.get(it.product_id, 0) + it.qty

    products = {
        p.id: p
        for p in db.scalars(
            select(Product).where(Product.id.in_(qty_by_id)).order_by(Product.id).with_for_update(of=Product)
        ).unique()
    }

    order = Order(user_id=user.id, address=data.address.strip(), note=(data.note or "").strip() or None,
                  payment_method=data.payment_method, total=0)
    for pid, qty in qty_by_id.items():
        p = products.get(pid)
        if not p or not p.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Mahsulot #{pid} topilmadi yoki sotuvda emas")
        if qty < p.moq:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"“{p.name}” uchun minimal buyurtma: {p.moq} {p.unit}")
        if qty > p.stock:
            raise HTTPException(status.HTTP_409_CONFLICT, f"“{p.name}” omborda yetarli emas (qoldiq: {p.stock} {p.unit})")
        price = p.price_for(qty)  # price is always computed on the server
        order.items.append(OrderItem(product_id=p.id, name=p.name, unit=p.unit, qty=qty, unit_price=price))
        order.total += price * qty
        p.stock -= qty

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/my", response_model=list[OrderOut])
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())).unique().all()
