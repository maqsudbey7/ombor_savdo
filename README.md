# 📦 OmborSavdo — ulgurji (omborlik) savdo platformasi

Full-stack e-commerce: **FastAPI + PostgreSQL** backend va **React + TypeScript** frontend.

| Qatlam | Texnologiyalar |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2 ORM, PostgreSQL, Pydantic v2, JWT, bcrypt, pytest |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, TanStack Query, React Router |
| API hujjati | Swagger UI — `/api/docs` |
| Deploy | Vercel (frontend + FastAPI serverless funksiya) + Neon PostgreSQL |

---

## 💻 Kompyuterda ishga tushirish

Kerak: **Python 3.11+**, **Node.js 20+**, **PostgreSQL**.

### 1) Alohida baza yaratish
pgAdmin → Query Tool:
```sql
CREATE DATABASE ombor_savdo;
```

### 2) Backend
```bash
cd backend
py -m venv .venv
source .venv/Scripts/activate     # Git Bash. CMD da: .venv\Scripts\activate
python -m pip install -r requirements.txt
```
`backend/.env` faylini yarating (`.env.example` dan nusxa):
```
DATABASE_URL=postgresql+psycopg://postgres:PAROLINGIZ@localhost:5432/ombor_savdo
JWT_SECRET=uzun-va-tasodifiy-maxfiy-kalit
```
> ⚠️ Parolda `#` bo'lsa, URL ichida **`%23`** deb yozing (`@` → `%40`), aks holda ulanish buziladi.
> `postgresql+psycopg2://` yoki `postgresql://` ko'rinishidagi URL ham ishlaydi.

Ishga tushirish:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
Jadvallar va 16 ta demo mahsulot avtomatik yaratiladi. Swagger: http://localhost:8000/api/docs

### 3) Frontend (yangi terminalda)
```bash
cd frontend
npm install
npm run dev
```
Sayt: **http://localhost:5173** · Admin: `+998900000000` / `admin123`

---

## 🚀 Vercel'ga joylash

Vercel `localhost` dagi bazaga ulana olmaydi, shuning uchun internetdagi bepul PostgreSQL (Neon) kerak.

1. **vercel.com** → GitHub bilan kiring → **Add New → Project** → shu repozitoriyni **Import** qiling.
   Sozlamalarni o'zgartirmang (`vercel.json` hammasini o'zi belgilaydi) → **Deploy**.
2. Loyiha sahifasida **Storage → Create Database → Neon (Postgres)** → loyihaga ulang.
   Vercel `DATABASE_URL` ni o'zi qo'shadi.
3. **Settings → Environment Variables** ga qo'shing:
   - `JWT_SECRET` — uzun tasodifiy matn
   - `ADMIN_PASSWORD` — admin uchun yangi parol (ixtiyoriy)
4. **Deployments → ⋯ → Redeploy**.

Tayyor: `https://<loyiha>.vercel.app`, Swagger: `https://<loyiha>.vercel.app/api/docs`.
Birinchi so'rovda jadvallar va demo ma'lumotlar Neon bazasida avtomatik yaratiladi.

---

## 🧪 Testlar
```sql
CREATE DATABASE ombor_test;
```
```bash
cd backend
DATABASE_URL=postgresql+psycopg://postgres:PAROLINGIZ@localhost:5432/ombor_test python -m pytest
```

---

## Loyiha tuzilmasi
```
api/index.py          # Vercel Python funksiyasi (FastAPI'ni ulaydi)
vercel.json           # Vercel: frontend build + /api → FastAPI
requirements.txt      # Vercel uchun Python paketlar
backend/
  app/
    main.py           # FastAPI ilova, CORS, xatolarni qayta ishlash
    config.py         # .env sozlamalari (pydantic-settings)
    database.py       # engine, sessiya, init_db
    models.py         # SQLAlchemy modellari
    schemas.py        # Pydantic sxemalari
    security.py       # bcrypt, JWT, get_current_user, require_admin
    seed.py           # demo ma'lumotlar
    routers/          # auth, catalog, orders, admin
  tests/              # pytest (8 ta test)
frontend/src/
  types/api.ts        # TypeScript interfeyslari
  api/                # typed fetch klient
  hooks/queries.ts    # TanStack Query
  store/              # Redux Toolkit (auth, cart, ui)
  components/ pages/ pages/admin/
```

## Ma'lumotlar bazasi (One-to-Many)
`users` → `orders` · `categories` → `products` · `products` → `price_tiers` · `orders` → `order_items`

## API
| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Ro'yxatdan o'tish / kirish |
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| GET | `/api/categories`, `/api/products`, `/api/products/{id}` | Katalog |
| POST / GET | `/api/orders`, `/api/orders/my` | Buyurtmalar |
| GET | `/api/admin/stats`, `/api/admin/customers` | Statistika, mijozlar |
| GET / POST / PUT / DELETE | `/api/admin/products[/{id}]` | Mahsulot CRUD |
| PATCH | `/api/admin/products/{id}/stock` | Qoldiqni o'zgartirish |
| POST / DELETE | `/api/admin/categories[/{id}]` | Kategoriyalar |
| GET / PATCH | `/api/admin/orders[/{id}]` | Buyurtma holati |

Status kodlar: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`.
