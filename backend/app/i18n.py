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
        "uz": "Server vaqtincha javob bermayapti. Ma’lumotlaringiz xavfsiz — bir daqiqadan so‘ng qayta urinib ko‘ring.",
        "ru": "Сервер временно не отвечает. Ваши данные в безопасности — попробуйте через минуту.",
    },
    "db_error": {"uz": "Saqlashda xatolik yuz berdi. Qayta urinib ko‘ring", "ru": "Ошибка при сохранении. Попробуйте ещё раз"},
    "not_found": {"uz": "Topilmadi", "ru": "Не найдено"},
    "invalid_data": {"uz": "Ma’lumot noto‘g‘ri", "ru": "Неверные данные"},
    "initial_stock": {"uz": "Boshlang‘ich qoldiq", "ru": "Начальный остаток"},
    "weak_password": {"uz": "Parol kamida 8 ta belgidan iborat bo‘lib, harf va raqam qatnashishi kerak",
                      "ru": "Пароль должен быть не короче 8 символов и содержать буквы и цифры"},
    "wrong_password": {"uz": "Joriy parol noto‘g‘ri", "ru": "Текущий пароль неверный"},
    "wrong_password_short": {"uz": "Parol noto‘g‘ri", "ru": "Неверный пароль"},
    "same_password": {"uz": "Yangi parol eskisidan farq qilishi kerak", "ru": "Новый пароль должен отличаться от старого"},
    "too_many_attempts": {"uz": "Juda ko‘p noto‘g‘ri urinish. {m} daqiqadan so‘ng qayta urinib ko‘ring",
                          "ru": "Слишком много неудачных попыток. Попробуйте через {m} мин."},
    "demo_forbidden": {"uz": "Demo hisobda bu amal o‘chirilgan", "ru": "В демо-аккаунте это действие отключено"},
    "v_missing": {"uz": "«{f}» to‘ldirilishi shart", "ru": "Заполните поле «{f}»"},
    "v_short": {"uz": "«{f}» kamida {n} ta belgi bo‘lsin", "ru": "«{f}»: минимум {n} символов"},
    "v_long": {"uz": "«{f}» juda uzun (ko‘pi bilan {n} ta belgi)", "ru": "«{f}» слишком длинное (максимум {n} символов)"},
    "v_number": {"uz": "«{f}» raqam bo‘lishi kerak", "ru": "«{f}» должно быть числом"},
    "v_min": {"uz": "«{f}» {n} dan kichik bo‘lmasin", "ru": "«{f}» не может быть меньше {n}"},
    "v_gt": {"uz": "«{f}» {n} dan katta bo‘lishi kerak", "ru": "«{f}» должно быть больше {n}"},
    "v_date": {"uz": "«{f}» sanasi noto‘g‘ri", "ru": "Неверная дата в поле «{f}»"},
    "v_choice": {"uz": "«{f}» uchun noto‘g‘ri qiymat tanlangan", "ru": "Неверное значение поля «{f}»"},
    "v_bad": {"uz": "«{f}» noto‘g‘ri kiritilgan", "ru": "Поле «{f}» заполнено неверно"},
    "server_error": {"uz": "Kutilmagan xatolik. Birozdan so‘ng qayta urinib ko‘ring", "ru": "Непредвиденная ошибка. Попробуйте чуть позже"},}

FIELDS: dict[str, tuple[str, str]] = {
    "name": ("Nomi", "Название"), "phone": ("Telefon", "Телефон"), "password": ("Parol", "Пароль"),
    "current_password": ("Joriy parol", "Текущий пароль"), "new_password": ("Yangi parol", "Новый пароль"),
    "address": ("Manzil", "Адрес"), "description": ("Izoh", "Описание"), "color": ("Rang", "Цвет"),
    "sku": ("Artikul (SKU)", "Артикул (SKU)"), "unit": ("O‘lchov birligi", "Единица"),
    "cost_price": ("Tannarx", "Себестоимость"), "sale_price": ("Sotuv narxi", "Цена продажи"),
    "min_quantity": ("Minimal qoldiq", "Мин. остаток"), "initial_quantity": ("Boshlang‘ich qoldiq", "Начальный остаток"),
    "location": ("Joylashuv", "Место"), "quantity": ("Miqdor", "Количество"), "price": ("Narx", "Цена"),
    "counterparty": ("Kimdan / kimga", "Контрагент"), "note": ("Izoh", "Примечание"), "amount": ("Summa", "Сумма"),
    "given_date": ("Berilgan sana", "Дата выдачи"), "due_date": ("Qaytarish muddati", "Срок возврата"),
    "customer_name": ("Mijoz ismi", "Имя клиента"), "customer_phone": ("Mijoz telefoni", "Телефон клиента"),
    "product_id": ("Mahsulot", "Товар"), "type": ("Turi", "Тип"), "category_id": ("Kategoriya", "Категория"),
}


def field_label(key: str) -> str:
    pair = FIELDS.get(key)
    if not pair:
        return key
    return pair[1] if lang_var.get() == "ru" else pair[0]


def tr(key: str, **kw) -> str:
    msg = MESSAGES[key].get(lang_var.get()) or MESSAGES[key]["uz"]
    return msg.format(**kw) if kw else msg


def http_error(status: int, key: str, **kw) -> HTTPException:
    return HTTPException(status, tr(key, **kw))


def pick_lang(header: str | None) -> str:
    return "ru" if (header or "").lower().startswith("ru") else "uz"
