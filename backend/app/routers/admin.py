import re
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Order, OrderStatus, PriceTier, Product, Role, User
from ..schemas import (AdminOrderOut, CategoryIn, CategoryOut, CustomerOut, DailySales, LowStock, OrderStatusPatch,
                       ProductIn, ProductOut, StatsOut, StockPatch)
from ..security import require_admin
from .catalog import SortBy, product_query

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


def get_or_404(db: Session, model, obj_id: int, msg: str):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, msg)
    return obj


# ---------- Stats ----------
@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    not_cancelled = Order.status != OrderStatus.cancelled
    since = date.today() - timedelta(days=13)
    day = func.date(Order.created_at)
    daily = db.execute(
        select(day, func.sum(Order.total), func.count(Order.id))
        .where(not_cancelled, Order.created_at >= since).group_by(day).order_by(day)
    ).all()
    low = db.scalars(select(Product).where(Product.stock < Product.moq * 3).order_by(Product.stock).limit(10)).unique()
    return StatsOut(
        revenue=db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(not_cancelled)),
        orders=db.scalar(select(func.count(Order.id))),
        new_orders=db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.new)),
        customers=db.scalar(select(func.count(User.id)).where(User.role == Role.customer)),
        products=db.scalar(select(func.count(Product.id))),
        low_stock=[LowStock.model_validate(p) for p in low],
        daily=[DailySales(day=d, total=t, count=c) for d, t, c in daily],
    )


# ---------- Products ----------
@router.get("/products", response_model=list[ProductOut])
def admin_products(q: str | None = None, db: Session = Depends(get_db)):
    return db.scalars(product_query(q, None, SortBy.new, False, active_only=False)).unique().all()


def apply_product(db: Session, p: Product, data: ProductIn) -> Product:
    if data.category_id is not None:
        get_or_404(db, Category, data.category_id, "Kategoriya topilmadi")
    for field, value in data.model_dump(exclude={"tiers"}).items():
        setattr(p, field, value)
    p.tiers = [PriceTier(min_qty=t.min_qty, price=t.price) for t in data.tiers]
    db.add(p)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu SKU band")
    db.refresh(p)
    return p


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, db: Session = Depends(get_db)):
    return apply_product(db, Product(), data)


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db)):
    return apply_product(db, get_or_404(db, Product, product_id, "Mahsulot topilmadi"), data)


@router.patch("/products/{product_id}/stock", response_model=ProductOut)
def patch_stock(product_id: int, data: StockPatch, db: Session = Depends(get_db)):
    p = db.scalar(select(Product).where(Product.id == product_id).with_for_update(of=Product))
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mahsulot topilmadi")
    p.stock = max(0, p.stock + data.delta)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Product, product_id, "Mahsulot topilmadi"))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Categories ----------
def slugify(name: str) -> str:
    s = re.sub(r"[ʻʼ‘’'`]", "", name.lower())
    return re.sub(r"[^a-z0-9а-яё]+", "-", s).strip("-") or "kategoriya"


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryIn, db: Session = Depends(get_db)):
    base = slug = slugify(data.name)
    i = 2
    while db.scalar(select(Category.id).where(Category.slug == slug)):
        slug, i = f"{base}-{i}", i + 1
    c = Category(name=data.name.strip(), slug=slug, icon=data.icon or "📦")
    db.add(c)
    db.commit()
    return CategoryOut(id=c.id, name=c.name, slug=c.slug, icon=c.icon, product_count=0)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Category, category_id, "Kategoriya topilmadi"))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Orders ----------
@router.get("/orders", response_model=list[AdminOrderOut])
def admin_orders(status_: OrderStatus | None = Query(None, alias="status"), db: Session = Depends(get_db)):
    stmt = select(Order).order_by(Order.id.desc())
    if status_:
        stmt = stmt.where(Order.status == status_)
    return db.scalars(stmt).unique().all()


@router.patch("/orders/{order_id}", response_model=AdminOrderOut)
def update_order_status(order_id: int, data: OrderStatusPatch, db: Session = Depends(get_db)):
    order = get_or_404(db, Order, order_id, "Buyurtma topilmadi")
    old, new = order.status, data.status
    # Cancelling returns goods to stock; un-cancelling takes them again.
    if old != new and OrderStatus.cancelled in (old, new):
        sign = 1 if new == OrderStatus.cancelled else -1
        ids = [it.product_id for it in order.items if it.product_id]
        locked = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(ids)).with_for_update(of=Product)).unique()}
        for it in order.items:
            p = locked.get(it.product_id)
            if not p:
                continue
            if sign < 0 and p.stock < it.qty:
                raise HTTPException(status.HTTP_409_CONFLICT, f"“{p.name}” omborda yetarli emas")
            p.stock += sign * it.qty
    order.status = new
    db.commit()
    db.refresh(order)
    return order


# ---------- Customers ----------
@router.get("/customers", response_model=list[CustomerOut])
def customers(db: Session = Depends(get_db)):
    spent = func.coalesce(func.sum(case((Order.status != OrderStatus.cancelled, Order.total))), 0)
    rows = db.execute(
        select(User, func.count(Order.id), spent)
        .outerjoin(Order).where(User.role == Role.customer).group_by(User.id).order_by(spent.desc())
    ).all()
    return [CustomerOut(id=u.id, name=u.name, phone=u.phone, company=u.company, created_at=u.created_at, orders=n, spent=s)
            for u, n, s in rows]
