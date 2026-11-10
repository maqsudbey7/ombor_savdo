from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..i18n import http_error
from ..database import get_db
from ..models import Category, Product, Warehouse
from ..schemas import CategoryIn, CategoryOut
from ..security import get_warehouse

router = APIRouter(prefix="/warehouses/{warehouse_id}/categories", tags=["Kategoriyalar"])


def get_category(category_id: int, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)) -> Category:
    c = db.get(Category, category_id)
    if c is None or c.warehouse_id != wh.id:
        raise http_error(status.HTTP_404_NOT_FOUND, "category_not_found")
    return c


def save(db: Session, c: Category) -> CategoryOut:
    db.add(c)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise http_error(status.HTTP_409_CONFLICT, "category_exists")
    count = db.scalar(select(func.count(Product.id)).where(Product.category_id == c.id))
    return CategoryOut(id=c.id, name=c.name, color=c.color, product_count=count)


@router.get("", response_model=list[CategoryOut])
def list_categories(wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Category, func.count(Product.id)).outerjoin(Product, Product.category_id == Category.id)
        .where(Category.warehouse_id == wh.id).group_by(Category.id).order_by(Category.name)
    ).all()
    return [CategoryOut(id=c.id, name=c.name, color=c.color, product_count=n) for c, n in rows]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryIn, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    return save(db, Category(warehouse_id=wh.id, name=data.name.strip(), color=data.color))


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(data: CategoryIn, c: Category = Depends(get_category), db: Session = Depends(get_db)):
    c.name, c.color = data.name.strip(), data.color
    return save(db, c)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(c: Category = Depends(get_category), db: Session = Depends(get_db)):
    db.delete(c)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
