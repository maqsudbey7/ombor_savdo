import csv
import io
from enum import Enum

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..i18n import http_error, tr
from ..database import get_db
from ..models import Category, Movement, MovementType, Product, User, Warehouse
from ..schemas import ProductCreate, ProductOut, ProductUpdate
from ..security import get_current_user, get_warehouse

router = APIRouter(prefix="/warehouses/{warehouse_id}/products", tags=["Mahsulotlar"])


class StockFilter(str, Enum):
    all = "all"
    low = "low"
    out = "out"


class SortBy(str, Enum):
    name = "name"
    new = "new"
    qty_asc = "qty_asc"
    qty_desc = "qty_desc"
    value_desc = "value_desc"


def get_product(product_id: int, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)) -> Product:
    p = db.get(Product, product_id)
    if p is None or p.warehouse_id != wh.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "product_not_found")
    return p


def check_category(db: Session, wh: Warehouse, category_id: int | None) -> None:
    if category_id is not None:
        c = db.get(Category, category_id)
        if c is None or c.warehouse_id != wh.id:
            raise http_error(status.HTTP_400_BAD_REQUEST, "category_wrong_wh")


def commit_or_409(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise http_error(status.HTTP_409_CONFLICT, "sku_taken")


def query(wh: Warehouse, q: str | None, category_id: int | None, stock: StockFilter, sort: SortBy):
    stmt = select(Product).where(Product.warehouse_id == wh.id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.location.ilike(like)))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if stock == StockFilter.low:
        stmt = stmt.where(Product.quantity <= Product.min_quantity)
    elif stock == StockFilter.out:
        stmt = stmt.where(Product.quantity == 0)
    order = {
        SortBy.name: [Product.name],
        SortBy.new: [Product.id.desc()],
        SortBy.qty_asc: [Product.quantity, Product.name],
        SortBy.qty_desc: [Product.quantity.desc(), Product.name],
        SortBy.value_desc: [(Product.quantity * Product.cost_price).desc()],
    }[sort]
    return stmt.order_by(*order)


@router.get("", response_model=list[ProductOut])
def list_products(
    q: str | None = Query(None, description="Nomi, SKU yoki joylashuv bo‘yicha qidiruv"),
    category_id: int | None = None,
    stock: StockFilter = StockFilter.all,
    sort: SortBy = SortBy.name,
    wh: Warehouse = Depends(get_warehouse),
    db: Session = Depends(get_db),
):
    return db.scalars(query(wh, q, category_id, stock, sort)).unique().all()


@router.get("/export", response_class=Response, responses={200: {"content": {"text/csv": {}}}})
def export_csv(wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    """Qoldiqlarni Excel'da ochiladigan CSV fayl sifatida yuklab olish."""
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["SKU", "Nomi", "Kategoriya", "O‘lchov", "Qoldiq", "Min. qoldiq", "Tannarx", "Sotuv narxi", "Qiymati", "Joylashuv"])
    for p in db.scalars(query(wh, None, None, StockFilter.all, SortBy.name)).unique():
        w.writerow([p.sku, p.name, p.category.name if p.category else "", p.unit, p.quantity, p.min_quantity,
                    p.cost_price, p.sale_price, p.quantity * p.cost_price, p.location])
    return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="ombor-{wh.id}-qoldiq.csv"'})


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, wh: Warehouse = Depends(get_warehouse),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    check_category(db, wh, data.category_id)
    p = Product(warehouse_id=wh.id, quantity=data.initial_quantity, **data.model_dump(exclude={"initial_quantity"}))
    db.add(p)
    if data.initial_quantity:
        db.add(Movement(warehouse_id=wh.id, product=p, user_id=user.id, type=MovementType.incoming,
                        product_name=p.name, unit=p.unit, quantity=data.initial_quantity, delta=data.initial_quantity,
                        balance_after=data.initial_quantity, price=p.cost_price, note=tr("initial_stock")))
    commit_or_409(db)
    db.refresh(p)
    return p


@router.get("/{product_id}", response_model=ProductOut)
def get_one(p: Product = Depends(get_product)):
    return p


@router.put("/{product_id}", response_model=ProductOut)
def update_product(data: ProductUpdate, p: Product = Depends(get_product), wh: Warehouse = Depends(get_warehouse),
                   db: Session = Depends(get_db)):
    check_category(db, wh, data.category_id)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    commit_or_409(db)
    db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(p: Product = Depends(get_product), db: Session = Depends(get_db)):
    db.delete(p)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
