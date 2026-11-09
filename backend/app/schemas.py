import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import OrderStatus, PaymentMethod, Role


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
    company: str | None = Field(default=None, max_length=160)
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
    company: str | None
    role: Role


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Catalog ----------
class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    icon: str = Field(default="📦", max_length=16)


class CategoryOut(ORM):
    id: int
    name: str
    slug: str
    icon: str
    product_count: int = 0


class CategoryBrief(ORM):
    id: int
    name: str
    slug: str
    icon: str


class TierIn(BaseModel):
    min_qty: int = Field(gt=0)
    price: int = Field(gt=0)


class TierOut(ORM):
    min_qty: int
    price: int


class ProductIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    sku: str = Field(min_length=1, max_length=60)
    description: str = ""
    category_id: int | None = None
    image_url: str | None = Field(default=None, max_length=500)
    unit: str = Field(default="dona", min_length=1, max_length=20)
    pack_size: int = Field(default=1, ge=1)
    stock: int = Field(default=0, ge=0)
    moq: int = Field(default=1, ge=1)
    base_price: int = Field(gt=0)
    is_active: bool = True
    tiers: list[TierIn] = []

    @model_validator(mode="after")
    def check_tiers(self):
        seen = set()
        for t in self.tiers:
            if t.min_qty in seen:
                raise ValueError("Pog‘onalarda miqdor takrorlanmasligi kerak")
            seen.add(t.min_qty)
            if t.price >= self.base_price:
                raise ValueError("Pog‘ona narxi asosiy narxdan past bo‘lishi kerak")
        self.tiers.sort(key=lambda t: t.min_qty)
        self.image_url = self.image_url or None
        return self


class StockPatch(BaseModel):
    delta: int = Field(description="Qoldiqqa qo‘shiladigan (+) yoki ayriladigan (−) miqdor")


class ProductOut(ORM):
    id: int
    name: str
    sku: str
    description: str
    category_id: int | None
    category: CategoryBrief | None
    image_url: str | None
    unit: str
    pack_size: int
    stock: int
    moq: int
    base_price: int
    is_active: bool
    tiers: list[TierOut]
    created_at: datetime


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(gt=0)


class OrderIn(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    address: str = Field(min_length=5, max_length=500)
    note: str | None = Field(default=None, max_length=500)
    payment_method: PaymentMethod = PaymentMethod.cash


class OrderItemOut(ORM):
    id: int
    product_id: int | None
    name: str
    unit: str
    qty: int
    unit_price: int


class OrderOut(ORM):
    id: int
    status: OrderStatus
    total: int
    address: str
    note: str | None
    payment_method: PaymentMethod
    created_at: datetime
    items: list[OrderItemOut]


class AdminOrderOut(OrderOut):
    user: UserOut


class OrderStatusPatch(BaseModel):
    status: OrderStatus


# ---------- Admin ----------
class DailySales(BaseModel):
    day: date
    total: int
    count: int


class LowStock(ORM):
    id: int
    name: str
    stock: int
    unit: str
    moq: int


class StatsOut(BaseModel):
    revenue: int
    orders: int
    new_orders: int
    customers: int
    products: int
    low_stock: list[LowStock]
    daily: list[DailySales]


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str
    company: str | None
    created_at: datetime
    orders: int
    spent: int
