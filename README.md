# 📦 OmborSavdo — ombor hisobi tizimi

Har bir foydalanuvchi **o‘z omborlarini** ochib, mahsulotlar, qoldiq va kirim-chiqim hisobini yuritadi.

**Demo:** telefon `+998900000000`, parol `demo123` (yoki saytdagi “Demo’ni ko‘rish” tugmasi).

| Qatlam | Texnologiyalar |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2 ORM, PostgreSQL, Pydantic v2, JWT, bcrypt, pytest |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, TanStack Query, Motion (animatsiyalar) |
| API hujjati | Swagger UI — `/api/docs` |
| Deploy | Vercel (frontend + FastAPI serverless) + Neon PostgreSQL |

## Imkoniyatlar
- 🏬 **Cheksiz omborlar** — har biri alohida, faqat egasiga ko‘rinadi
- 📦 **Mahsulotlar** — SKU, kategoriya, o‘lchov birligi, tannarx/sotuv narxi, javon joylashuvi
- ⬇️⬆️ **Kirim / chiqim** — qoldiq avtomatik hisoblanadi, ombordagidan ko‘p chiqim qilib bo‘lmaydi
- 📋 **Inventarizatsiya** — haqiqiy sanoqni kiritish, farq tarixda saqlanadi
- ⚠️ **Kam qolganlar** — minimal qoldiqdan tushgan mahsulotlar ogohlantiriladi
- 📊 **Boshqaruv paneli** — ombor qiymati, 14 kunlik kirim-chiqim grafigi, kategoriyalar ulushi
- 📑 **Excel’ga eksport** (CSV)
- ✨ Animatsiyali zamonaviy dizayn, telefonda ham qulay

---

## 🚀 Vercel’ga joylash
1. vercel.com → **Add New → Project** → GitHub’dagi `ombor_savdo` ni **Import**.
2. **Application Preset: `Other`** (Services emas!) → **Deploy**.
3. **Storage → Create Database → Neon** → loyihaga ulang (`DATABASE_URL` o‘zi qo‘shiladi).
4. **Settings → Environment Variables** → `JWT_SECRET` = uzun tasodifiy matn.
5. **Deployments → ⋯ → Redeploy**.

Tekshirish: `https://<loyiha>.vercel.app/api/health` → `{"status":"ok","database":"ok"}`.
Agar `"database":"not_configured"` chiqsa — 3-qadam bajarilmagan.

---

## 💻 Kompyuterda ishga tushirish

Kerak: **Python 3.11+**, **Node.js 20+**, **PostgreSQL**.

**1. Baza** (pgAdmin → Query Tool):
```sql
CREATE DATABASE ombor_savdo;
```

**2. Backend** (Git Bash):
```bash
cd backend
py -m venv .venv
source .venv/Scripts/activate        # CMD: .venv\Scripts\activate
python -m pip install -r requirements.txt
cp .env.example .env                 # so‘ng DATABASE_URL ni o‘zingiznikiga o‘zgartiring
python -m uvicorn app.main:app --reload --port 8000
```
> Parolda `#` bo‘lsa URL ichida `%23` deb yozing. `postgresql+psycopg2://…` formati ham ishlaydi.

**3. Frontend** (yangi terminal):
```bash
cd frontend
npm install
npm run dev
```
Sayt: http://localhost:5173 · Swagger: http://localhost:8000/api/docs

**Testlar:** `CREATE DATABASE ombor_test;` so‘ng
`DATABASE_URL=postgresql+psycopg://postgres:PAROL@localhost:5432/ombor_test python -m pytest`

---

## Ma'lumotlar bazasi (One-to-Many)
```
ombor_users 1──N ombor_warehouses 1──N ombor_categories
                                  1──N ombor_products 1──N ombor_movements
```
Jadvallar `ombor_` prefiksi bilan — bir bazada boshqa loyiha (masalan online_shop) jadvallari bilan to‘qnashmaydi.

## API
| Metod | Yo‘l | Vazifa |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Ro‘yxatdan o‘tish / kirish |
| GET | `/api/auth/me` | Joriy foydalanuvchi |
| GET / POST | `/api/warehouses` | Omborlarim (statistika bilan) / yangi ombor |
| GET / PUT / DELETE | `/api/warehouses/{id}` | Ombor |
| GET | `/api/warehouses/{id}/dashboard` | Boshqaruv paneli ma’lumotlari |
| GET / POST / PUT / DELETE | `/api/warehouses/{id}/categories[/{cid}]` | Kategoriyalar |
| GET / POST / PUT / DELETE | `/api/warehouses/{id}/products[/{pid}]` | Mahsulotlar (`q`, `category_id`, `stock`, `sort`) |
| GET | `/api/warehouses/{id}/products/export` | CSV eksport |
| GET / POST | `/api/warehouses/{id}/movements` | Kirim / chiqim / inventarizatsiya |
| GET | `/api/health` | Server va baza holati |

Status kodlar: `200`, `201`, `204`, `400`, `401`, `404`, `409` (qoldiq yetmaydi, SKU band), `422`, `503` (baza ulanmagan).
Kirim-chiqimda mahsulot qatori `SELECT … FOR UPDATE` bilan bloklanadi — bir vaqtdagi ikki chiqim qoldiqni manfiy qila olmaydi.

## Loyiha tuzilmasi
```
api/index.py            Vercel Python funksiyasi
vercel.json             Vercel sozlamasi (frontend build + /api → FastAPI)
backend/app/
  main.py               FastAPI, CORS, xatolarni qayta ishlash, /api/health
  config.py database.py models.py schemas.py security.py seed.py
  routers/              auth, warehouses, categories, products, movements
backend/tests/          pytest
frontend/src/
  types/api.ts          TypeScript interfeyslari
  api/                  typed fetch klient
  hooks/queries.ts      TanStack Query
  store/                Redux Toolkit (auth, ui)
  components/           AppLayout, Modal/Drawer, MovementModal, ProductDrawer…
  pages/                Landing, Auth, Warehouses, warehouse/*
```
