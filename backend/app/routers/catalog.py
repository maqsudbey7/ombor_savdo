from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Product
from ..schemas import CategoryOut, ProductOut

router = APIRouter(tags=["Katalog"])


class SortBy(str, Enum):
    recommended = "recommended"
    price_asc = "price_asc"
    price_desc = "price_desc"
    new = "new"
    name = "name"


def product_query(q: str | None, category: str | None, sort: SortBy, in_stock: bool, active_only: bool):
    stmt = select(Product).outerjoin(Category)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
    if category:
        stmt = stmt.where(Category.slug == category)
    if in_stock:
        stmt = stmt.where(Product.stock > 0)
    order = {
        SortBy.price_asc: [Product.base_price.asc()],
        SortBy.price_desc: [Product.base_price.desc()],
        SortBy.new: [Product.id.desc()],
        SortBy.name: [Product.name.asc()],
    }.get(sort, [(Product.stock == 0).asc(), Product.id.asc()])
    return stmt.order_by(*order)


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    count = (
        select(func.count(Product.id))
        .where(Product.category_id == Category.id, Product.is_active.is_(True))
        .correlate(Category).scalar_subquery()
    )
    rows = db.execute(select(Category, count).order_by(Category.id)).all()
    return [CategoryOut(id=c.id, name=c.name, slug=c.slug, icon=c.icon, product_count=n) for c, n in rows]


@router.get("/products", response_model=list[ProductOut])
def list_products(
    q: str | None = Query(None, description="Nomi yoki SKU bo‘yicha qidiruv"),
    category: str | None = Query(None, description="Kategoriya slug"),
    sort: SortBy = SortBy.recommended,
    in_stock: bool = False,
    db: Session = Depends(get_db),
):
    return db.scalars(product_query(q, category, sort, in_stock, active_only=True)).unique().all()


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p or not p.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mahsulot topilmadi")
    return p
