"""Ma'lumotlar bazasi modellari.

Bog'lanishlar (One-to-Many):
    User 1 ── N Warehouse 1 ── N Category
                         1 ── N Product 1 ── N Movement
                         1 ── N Customer 1 ── N Debt 1 ── N DebtPayment
Jadval nomlari `ombor_` prefiksi bilan — bir bazada boshqa loyiha jadvallari bilan to'qnashmaydi.
"""
import enum
from datetime import date, datetime

from sqlalchemy import (BigInteger, CheckConstraint, Date, DateTime, Enum, ForeignKey, Integer, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class MovementType(str, enum.Enum):
    incoming = "in"        # kirim
    outgoing = "out"       # chiqim
    adjust = "adjust"      # inventarizatsiya (haqiqiy sanoqqa tenglash)


class User(Base):
    __tablename__ = "ombor_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    warehouses: Mapped[list["Warehouse"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Warehouse(Base):
    __tablename__ = "ombor_warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("ombor_users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    address: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(20), default="blue")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship(back_populates="warehouses")
    categories: Mapped[list["Category"]] = relationship(back_populates="warehouse", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship(back_populates="warehouse", cascade="all, delete-orphan")
    movements: Mapped[list["Movement"]] = relationship(back_populates="warehouse", cascade="all, delete-orphan")
    customers: Mapped[list["Customer"]] = relationship(back_populates="warehouse", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "ombor_categories"
    __table_args__ = (UniqueConstraint("warehouse_id", "name", name="uq_category_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("ombor_warehouses.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    color: Mapped[str] = mapped_column(String(20), default="slate")

    warehouse: Mapped[Warehouse] = relationship(back_populates="categories")
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "ombor_products"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "sku", name="uq_product_sku"),
        CheckConstraint("quantity >= 0", name="ck_product_qty_nonneg"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("ombor_warehouses.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("ombor_categories.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    sku: Mapped[str] = mapped_column(String(60))
    unit: Mapped[str] = mapped_column(String(20), default="dona")
    cost_price: Mapped[int] = mapped_column(BigInteger, default=0)   # tannarx (kirim narxi)
    sale_price: Mapped[int] = mapped_column(BigInteger, default=0)   # sotuv narxi
    quantity: Mapped[int] = mapped_column(Integer, default=0)        # joriy qoldiq
    min_quantity: Mapped[int] = mapped_column(Integer, default=0)    # shu miqdordan kam bo'lsa ogohlantirish
    location: Mapped[str] = mapped_column(String(60), default="")    # javon/qator, masalan "A-3"
    description: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    warehouse: Mapped[Warehouse] = relationship(back_populates="products")
    category: Mapped[Category | None] = relationship(back_populates="products", lazy="joined")
    movements: Mapped[list["Movement"]] = relationship(back_populates="product")


class Movement(Base):
    """Ombordagi har bir o'zgarish: kirim, chiqim yoki inventarizatsiya."""

    __tablename__ = "ombor_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("ombor_warehouses.id", ondelete="CASCADE"), index=True)
    # Mahsulot o'chirilsa ham tarix saqlanadi (nomi alohida yozib qo'yiladi).
    product_id: Mapped[int | None] = mapped_column(ForeignKey("ombor_products.id", ondelete="SET NULL"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("ombor_users.id", ondelete="SET NULL"))
    type: Mapped[MovementType] = mapped_column(Enum(MovementType, native_enum=False, length=10,
                                                    values_callable=lambda e: [m.value for m in e]))
    product_name: Mapped[str] = mapped_column(String(200))
    unit: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)          # kiritilgan miqdor (inventarizatsiyada — haqiqiy sanoq)
    delta: Mapped[int] = mapped_column(Integer)             # qoldiqqa ta'siri (+/−)
    balance_after: Mapped[int] = mapped_column(Integer)     # harakatdan keyingi qoldiq
    price: Mapped[int] = mapped_column(BigInteger, default=0)
    counterparty: Mapped[str] = mapped_column(String(160), default="")  # yetkazib beruvchi / mijoz
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    warehouse: Mapped[Warehouse] = relationship(back_populates="movements")
    product: Mapped[Product | None] = relationship(back_populates="movements")
    debt: Mapped["Debt | None"] = relationship(back_populates="movement", uselist=False, lazy="selectin")

    @property
    def debt_id(self) -> int | None:
        return self.debt.id if self.debt else None


class Customer(Base):
    """Qarzdor mijoz (do'kon, usta, tashkilot...)."""

    __tablename__ = "ombor_customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("ombor_warehouses.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    warehouse: Mapped[Warehouse] = relationship(back_populates="customers")
    debts: Mapped[list["Debt"]] = relationship(back_populates="customer", cascade="all, delete-orphan",
                                               order_by="Debt.given_date.desc()", lazy="selectin")


class Debt(Base):
    """Qarzga berilgan tovar yoki pul: kimga, nima, qancha, qachongacha."""

    __tablename__ = "ombor_debts"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_debt_amount_pos"),
        CheckConstraint("paid_amount >= 0 AND paid_amount <= amount", name="ck_debt_paid_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("ombor_warehouses.id", ondelete="CASCADE"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("ombor_customers.id", ondelete="CASCADE"), index=True)
    movement_id: Mapped[int | None] = mapped_column(ForeignKey("ombor_movements.id", ondelete="SET NULL"), unique=True)
    description: Mapped[str] = mapped_column(String(300))
    amount: Mapped[int] = mapped_column(BigInteger)
    paid_amount: Mapped[int] = mapped_column(BigInteger, default=0)
    given_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date, index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped[Customer] = relationship(back_populates="debts", lazy="joined")
    movement: Mapped[Movement | None] = relationship(back_populates="debt")
    payments: Mapped[list["DebtPayment"]] = relationship(back_populates="debt", cascade="all, delete-orphan",
                                                          order_by="DebtPayment.paid_at.desc()", lazy="selectin")

    @property
    def remaining(self) -> int:
        return self.amount - self.paid_amount


class DebtPayment(Base):
    """Qarzni qaytarish (qisman yoki to'liq)."""

    __tablename__ = "ombor_debt_payments"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_payment_amount_pos"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    debt_id: Mapped[int] = mapped_column(ForeignKey("ombor_debts.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("ombor_users.id", ondelete="SET NULL"))
    amount: Mapped[int] = mapped_column(BigInteger)
    note: Mapped[str] = mapped_column(String(300), default="")
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    debt: Mapped[Debt] = relationship(back_populates="payments")
