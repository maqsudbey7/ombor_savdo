"""Ikki tilli (o'zbek / rus) server xabarlari.

Frontend har bir so'rovda `Accept-Language: uz|ru` yuboradi; middleware tilni shu contextvar'ga yozadi.
"""
from contextvars import ContextVar

from fastapi import HTTPException

lang_var: ContextVar[str] = ContextVar("lang", default="uz")

MESSAGES: dict[str, dict[str, str]] = {
    "login_required": {"uz": "Tizimga kiring", "ru": "Войдите в систему"},
    "session_expired": {"uz": "Sessiya tugagan, qayta kiring", "ru": "Сессия истекла, войдите снова"},
    "phone_taken": {"uz": "Bu telefon raqam ro‘yxatdan o‘tgan", "ru": "Этот номер уже зарегистрирован"},
    "bad_credentials": {"uz": "Telefon yoki parol noto‘g‘ri", "ru": "Неверный телефон или пароль"},
    "bad_phone": {"uz": "Telefon raqam noto‘g‘ri", "ru": "Неверный номер телефона"},
    "warehouse_not_found": {"uz": "Ombor topilmadi", "ru": "Склад не найден"},
    "category_not_found": {"uz": "Kategoriya topilmadi", "ru": "Категория не найдена"},
    "category_exists": {"uz": "Bunday nomli kategoriya bor", "ru": "Категория с таким названием уже есть"},
    "category_wrong_wh": {"uz": "Kategoriya bu omborga tegishli emas", "ru": "Категория не относится к этому складу"},
    "product_not_found": {"uz": "Mahsulot topilmadi", "ru": "Товар не найден"},
    "sku_taken": {"uz": "Bu SKU (artikul) shu omborda band", "ru": "Этот артикул (SKU) уже занят на складе"},
    "qty_positive": {"uz": "Miqdor 0 dan katta bo‘lishi kerak", "ru": "Количество должно быть больше 0"},
    "not_enough_stock": {"uz": "Omborda yetarli emas: qoldiq {qty} {unit}", "ru": "Недостаточно на складе: остаток {qty} {unit}"},
    "customer_not_found": {"uz": "Mijoz topilmadi", "ru": "Клиент не найден"},
    "customer_required": {"uz": "Mijozni tanlang yoki ismini kiriting", "ru": "Выберите клиента или введите имя"},
    "debt_not_found": {"uz": "Qarz topilmadi", "ru": "Долг не найден"},
    "payment_not_found": {"uz": "To‘lov topilmadi", "ru": "Платёж не найден"},
    "debt_already_paid": {"uz": "Bu qarz to‘liq to‘langan", "ru": "Этот долг уже полностью погашен"},
    "payment_too_much": {"uz": "To‘lov qarz qoldig‘idan ko‘p: qoldiq {rest} so‘m", "ru": "Платёж больше остатка долга: остаток {rest} сум"},
    "amount_below_paid": {"uz": "Summa to‘langan qismdan ({paid} so‘m) kam bo‘lishi mumkin emas", "ru": "Сумма не может быть меньше уже оплаченной ({paid} сум)"},
    "due_before_given": {"uz": "Qaytarish muddati berilgan sanadan oldin bo‘lishi mumkin emas", "ru": "Срок возврата не может быть раньше даты выдачи"},
    "debt_only_out": {"uz": "Qarz faqat chiqimda yozilishi mumkin", "ru": "Долг можно оформить только при расходе"},
    "debt_zero_sum": {"uz": "Qarz summasi 0 bo‘lmasligi kerak — narxni kiriting", "ru": "Сумма долга не может быть 0 — укажите цену"},
    "db_unavailable": {
        "uz": "Ma’lumotlar bazasiga ulanib bo‘lmadi. Vercel’da Storage → Neon bazasini loyihaga ulang (DATABASE_URL), so‘ng Redeploy qiling.",
        "ru": "Не удалось подключиться к базе данных. В Vercel подключите Storage → Neon (DATABASE_URL) и сделайте Redeploy.",
    },
    "db_error": {"uz": "Bazada xatolik yuz berdi", "ru": "Ошибка базы данных"},
    "not_found": {"uz": "Topilmadi", "ru": "Не найдено"},
    "invalid_data": {"uz": "Ma’lumot noto‘g‘ri", "ru": "Неверные данные"},
    "initial_stock": {"uz": "Boshlang‘ich qoldiq", "ru": "Начальный остаток"},
}


def tr(key: str, **kw) -> str:
    msg = MESSAGES[key].get(lang_var.get()) or MESSAGES[key]["uz"]
    return msg.format(**kw) if kw else msg


def http_error(status: int, key: str, **kw) -> HTTPException:
    return HTTPException(status, tr(key, **kw))


def pick_lang(header: str | None) -> str:
    return "ru" if (header or "").lower().startswith("ru") else "uz"
