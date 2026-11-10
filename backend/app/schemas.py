import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .i18n import tr
from .models import MovementType
from .timeutil import today

COLORS = ("blue", "emerald", "amber", "rose", "violet", "cyan", "orange", "slate")
Color = Literal["blue", "emerald", "amber", "rose", "violet", "cyan", "orange", "slate"]


def normalize_phone(v: str) -> str:
    v = re.sub(r"[^\d+]", "", v or "")
    if not re.fullmatch(r"\+?\d{9,15}", v):
        raise ValueError(tr("bad_phone"))
    return v


def optional_phone(v: str | None) -> str:
    return normalize_phone(v) if v and re.sub(r"[^\d]", "", v) not in ("", "998") else ""


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
class DebtForMovement(BaseModel):
    """Chiqim qarzga berilganda: kimga va qachongacha."""
    customer_id: int | None = None
    customer_name: str | None = Field(default=None, max_length=120)
    customer_phone: str | None = None
    due_date: date | None = None

    _phone = field_validator("customer_phone")(optional_phone)

    @model_validator(mode="after")
    def check(self):
        if not self.customer_id and not (self.customer_name or "").strip():
            raise ValueError(tr("customer_required"))
        if self.due_date and self.due_date < today():
            raise ValueError(tr("due_before_given"))
        return self


class MovementIn(BaseModel):
    product_id: int
    type: MovementType
    quantity: int = Field(ge=0, description="Kirim/chiqim miqdori yoki inventarizatsiyada haqiqiy sanoq")
    price: int | None = Field(default=None, ge=0, description="Bo‘sh bo‘lsa mahsulot narxi olinadi")
    counterparty: str = Field(default="", max_length=160)
    note: str = Field(default="", max_length=500)
    debt: DebtForMovement | None = Field(default=None, description="Faqat chiqimda: qarzga berildi")


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
    debt_id: int | None = None


# ---------- Qarzdorlik ----------
DebtStatus = Literal["paid", "overdue", "due_today", "due_soon", "open"]


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = ""
    note: str = Field(default="", max_length=1000)

    _phone = field_validator("phone")(optional_phone)


class CustomerBrief(ORM):
    id: int
    name: str
    phone: str


class CustomerOut(CustomerBrief):
    note: str
    created_at: datetime
    total: int = 0          # jami berilgan qarz
    paid: int = 0           # qaytarilgan
    remaining: int = 0      # qolgan qarz
    open_count: int = 0
    overdue_count: int = 0
    next_due: date | None = None


class DebtCreate(BaseModel):
    customer_id: int | None = None
    customer_name: str | None = Field(default=None, max_length=120)
    customer_phone: str | None = None
    description: str = Field(min_length=1, max_length=300)
    amount: int = Field(gt=0)
    given_date: date = Field(default_factory=today)
    due_date: date | None = None
    note: str = Field(default="", max_length=1000)

    _phone = field_validator("customer_phone")(optional_phone)

    @model_validator(mode="after")
    def check(self):
        if not self.customer_id and not (self.customer_name or "").strip():
            raise ValueError(tr("customer_required"))
        if self.due_date and self.due_date < self.given_date:
            raise ValueError(tr("due_before_given"))
        return self


class DebtUpdate(BaseModel):
    description: str = Field(min_length=1, max_length=300)
    amount: int = Field(gt=0)
    given_date: date
    due_date: date | None = None
    note: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def check(self):
        if self.due_date and self.due_date < self.given_date:
            raise ValueError(tr("due_before_given"))
        return self


class PaymentIn(BaseModel):
    amount: int = Field(gt=0)
    note: str = Field(default="", max_length=300)


class PaymentOut(ORM):
    id: int
    amount: int
    note: str
    paid_at: datetime


class DebtOut(ORM):
    id: int
    customer: CustomerBrief
    description: str
    amount: int
    paid_amount: int
    remaining: int
    given_date: date
    due_date: date | None
    status: DebtStatus
    days_left: int | None      # muddatgacha qolgan kun (manfiy — o'tib ketgan)
    note: str
    reminded_at: datetime | None
    movement_id: int | None
    created_at: datetime
    payments: list[PaymentOut]


class DebtSummary(BaseModel):
    outstanding: int            # jami qolgan qarz
    overdue_amount: int
    overdue_count: int
    due_today_count: int
    due_soon_count: int         # 3 kun ichida
    debtors_count: int          # qarzi bor mijozlar
    collected_30d: int          # so'nggi 30 kunda qaytarilgan


class NotificationOut(BaseModel):
    kind: Literal["overdue", "due_today", "due_soon"]
    warehouse_id: int
    warehouse_name: str
    debt_id: int
    customer_id: int
    customer_name: str
    customer_phone: str
    description: str
    remaining: int
    due_date: date
    days_left: int


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
