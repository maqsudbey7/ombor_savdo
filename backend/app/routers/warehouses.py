from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Movement, MovementType, Product, User, Warehouse
from ..schemas import (CategoryShare, DailyFlow, DashboardOut, LowStockItem, MovementOut, WarehouseCreate, WarehouseIn,
                       WarehouseOut, WarehouseSummary)
from ..security import get_current_user, get_warehouse

router = APIRouter(prefix="/warehouses", tags=["Omborlar"])

low_stock = Product.quantity <= Product.min_quantity


@router.get("", response_model=list[WarehouseSummary])
def list_warehouses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = (
        select(
            Product.warehouse_id.label("wid"),
            func.count(Product.id).label("cnt"),
            func.coalesce(func.sum(Product.quantity), 0).label("qty"),
            func.coalesce(func.sum(Product.quantity * Product.cost_price), 0).label("value"),
            func.count(case((low_stock, 1))).label("low"),
        ).group_by(Product.warehouse_id).subquery()
    )
    m = select(Movement.warehouse_id.label("wid"), func.max(Movement.created_at).label("last")).group_by(Movement.warehouse_id).subquery()
    rows = db.execute(
        select(Warehouse, p.c.cnt, p.c.qty, p.c.value, p.c.low, m.c.last)
        .outerjoin(p, p.c.wid == Warehouse.id).outerjoin(m, m.c.wid == Warehouse.id)
        .where(Warehouse.owner_id == user.id).order_by(Warehouse.id)
    ).all()
    return [
        WarehouseSummary(**WarehouseOut.model_validate(w).model_dump(), product_count=cnt or 0, total_quantity=qty or 0,
                         stock_value=value or 0, low_stock_count=low or 0, last_movement_at=last)
        for w, cnt, qty, value, low, last in rows
    ]


@router.post("", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
def create_warehouse(data: WarehouseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wh = Warehouse(owner_id=user.id, **data.model_dump(exclude={"with_sample"}))
    db.add(wh)
    db.flush()
    if data.with_sample:
        from ..seed import fill_warehouse
        fill_warehouse(db, wh, user)
    db.commit()
    return wh


@router.get("/{warehouse_id}", response_model=WarehouseOut)
def get_one(wh: Warehouse = Depends(get_warehouse)):
    return wh


@router.put("/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(data: WarehouseIn, wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    for k, v in data.model_dump().items():
        setattr(wh, k, v)
    db.commit()
    return wh


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    db.delete(wh)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{warehouse_id}/dashboard", response_model=DashboardOut)
def dashboard(wh: Warehouse = Depends(get_warehouse), db: Session = Depends(get_db)):
    wid = wh.id
    totals = db.execute(
        select(
            func.count(Product.id), func.coalesce(func.sum(Product.quantity), 0),
            func.coalesce(func.sum(Product.quantity * Product.cost_price), 0),
            func.coalesce(func.sum(Product.quantity * Product.sale_price), 0),
            func.count(case((low_stock, 1))), func.count(case((Product.quantity == 0, 1))),
        ).where(Product.warehouse_id == wid)
    ).one()

    today = datetime.now(timezone.utc).date()
    since = datetime.combine(today - timedelta(days=13), datetime.min.time(), tzinfo=timezone.utc)
    day = func.date(Movement.created_at)
    is_in = Movement.type == MovementType.incoming
    is_out = Movement.type == MovementType.outgoing
    flows = {
        d: (iq, oq, iv, ov)
        for d, iq, oq, iv, ov in db.execute(
            select(
                day,
                func.coalesce(func.sum(case((is_in, Movement.quantity))), 0),
                func.coalesce(func.sum(case((is_out, Movement.quantity))), 0),
                func.coalesce(func.sum(case((is_in, Movement.quantity * Movement.price))), 0),
                func.coalesce(func.sum(case((is_out, Movement.quantity * Movement.price))), 0),
            ).where(Movement.warehouse_id == wid, Movement.created_at >= since).group_by(day)
        ).all()
    }
    daily = []
    for i in range(14):
        d: date = today - timedelta(days=13 - i)
        iq, oq, iv, ov = flows.get(d, (0, 0, 0, 0))
        daily.append(DailyFlow(day=d, in_qty=iq, out_qty=oq, in_value=iv, out_value=ov))

    month_start = datetime.combine(today - timedelta(days=29), datetime.min.time(), tzinfo=timezone.utc)
    month_in, month_out = db.execute(
        select(
            func.coalesce(func.sum(case((is_in, Movement.quantity * Movement.price))), 0),
            func.coalesce(func.sum(case((is_out, Movement.quantity * Movement.price))), 0),
        ).where(Movement.warehouse_id == wid, Movement.created_at >= month_start)
    ).one()

    low = db.scalars(
        select(Product).where(Product.warehouse_id == wid, low_stock).order_by(Product.quantity, Product.name).limit(8)
    ).unique().all()
    cats = db.execute(
        select(func.coalesce(Category.name, "Kategoriyasiz"), func.coalesce(Category.color, "slate"),
               func.count(Product.id), func.coalesce(func.sum(Product.quantity * Product.cost_price), 0))
        .select_from(Product).outerjoin(Category, Category.id == Product.category_id)
        .where(Product.warehouse_id == wid).group_by(Category.name, Category.color)
        .order_by(func.sum(Product.quantity * Product.cost_price).desc())
    ).all()
    recent = db.scalars(select(Movement).where(Movement.warehouse_id == wid).order_by(Movement.created_at.desc(), Movement.id.desc()).limit(8)).all()

    return DashboardOut(
        product_count=totals[0], total_quantity=totals[1], stock_value=totals[2], potential_revenue=totals[3],
        low_stock_count=totals[4], out_of_stock_count=totals[5], month_in_value=month_in, month_out_value=month_out,
        daily=daily, low_stock=[LowStockItem.model_validate(p) for p in low],
        categories=[CategoryShare(name=n, color=c, product_count=cnt, stock_value=v) for n, c, cnt, v in cats],
        recent=[MovementOut.model_validate(m) for m in recent],
    )
