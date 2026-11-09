import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .models import MovementType

COLORS = ("blue", "emerald", "amber", "rose", "violet", "cyan", "orange", "slate")
Color = Literal["blue", "emerald", "amber", "rose", "violet", "cyan", "orange", "slate"]


def normalize_phone(v: str) -> str:
    v = re.sub(r"[^\d+]", "", v or "")
    if not re.fullmatch(r"\+?\d{9,15}", v):
        raise ValueError("Telefon raqam noto‘g‘ri")
    return v


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str
    password: str = Field(min_length=6, max_length=128)

    _phone = field_validator("phone")(normalize_phone)


class LoginIn(BaseModel):
    phone: str
    password: str

    _phone = field_validator("phone")(normalize_phone)


class UserOut(ORM):
    id: int
    name: str
    phone: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Warehouses ----------
class WarehouseIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=1000)
    color: Color = "blue"


class WarehouseCreate(WarehouseIn):
    with_sample: bool = Field(default=False, description="Namuna kategoriya va mahsulotlar bilan to‘ldirish")


class WarehouseOut(ORM):
    id: int
    name: str
    address: str
    description: str
    color: str
    created_at: datetime


class WarehouseSummary(WarehouseOut):
    product_count: int
    total_quantity: int
    stock_value: int
    low_stock_count: int
    last_movement_at: datetime | None


# ---------- Categories ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: Color = "slate"


class CategoryOut(ORM):
    id: int
    name: str
    color: str
    product_count: int = 0


class CategoryBrief(ORM):
    id: int
    name: str
    color: str


# ---------- Products ----------
class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    sku: str = Field(min_length=1, max_length=60)
    category_id: int | None = None
    unit: str = Field(default="dona", min_length=1, max_length=20)
    cost_price: int = Field(default=0, ge=0)
    sale_price: int = Field(default=0, ge=0)
    min_quantity: int = Field(default=0, ge=0)
    location: str = Field(default="", max_length=60)
    description: str = Field(default="", max_length=2000)


class ProductCreate(ProductBase):
    initial_quantity: int = Field(default=0, ge=0, description="Boshlang‘ich qoldiq (kirim sifatida yoziladi)")


class ProductUpdate(ProductBase):
    """Qoldiq bu yerda o‘zgarmaydi — faqat kirim/chiqim/inventarizatsiya orqali."""


class ProductOut(ORM):
    id: int
    name: str
    sku: str
    category_id: int | None
    category: CategoryBrief | None
    unit: str
    cost_price: int
    sale_price: int
    quantity: int
    min_quantity: int
    location: str
    description: str
    created_at: datetime
    updated_at: datetime


# ---------- Movements ----------
class MovementIn(BaseModel):
    product_id: int
    type: MovementType
    quantity: int = Field(ge=0, description="Kirim/chiqim miqdori yoki inventarizatsiyada haqiqiy sanoq")
    price: int | None = Field(default=None, ge=0, description="Bo‘sh bo‘lsa mahsulot narxi olinadi")
    counterparty: str = Field(default="", max_length=160)
    note: str = Field(default="", max_length=500)


class MovementOut(ORM):
    id: int
    product_id: int | None
    type: MovementType
    product_name: str
    unit: str
    quantity: int
    delta: int
    balance_after: int
    price: int
    counterparty: str
    note: str
    created_at: datetime


# ---------- Dashboard ----------
class DailyFlow(BaseModel):
    day: date
    in_qty: int
    out_qty: int
    in_value: int
    out_value: int


class CategoryShare(BaseModel):
    name: str
    color: str
    product_count: int
    stock_value: int


class LowStockItem(ORM):
    id: int
    name: str
    sku: str
    unit: str
    quantity: int
    min_quantity: int


class DashboardOut(BaseModel):
    product_count: int
    total_quantity: int
    stock_value: int
    potential_revenue: int
    low_stock_count: int
    out_of_stock_count: int
    month_in_value: int
    month_out_value: int
    daily: list[DailyFlow]
    low_stock: list[LowStockItem]
    categories: list[CategoryShare]
    recent: list[MovementOut]
