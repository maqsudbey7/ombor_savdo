from tests.conftest import register


def test_auth(client, user):
    assert client.post("/api/auth/register", json={"name": "Boshqa", "phone": "+998911112233", "password": "secret12"}).status_code == 409
    assert client.post("/api/auth/login", json={"phone": "+998911112233", "password": "noto'g'ri"}).status_code == 401
    assert client.get("/api/auth/me", headers=user).json()["phone"] == "+998911112233"
    assert client.get("/api/warehouses").status_code == 401


def test_demo_account_has_data(client):
    r = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"})
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    whs = client.get("/api/warehouses", headers=h).json()
    assert len(whs) == 2 and whs[0]["product_count"] > 0
    d = client.get(f"/api/warehouses/{whs[0]['id']}/dashboard", headers=h).json()
    assert len(d["daily"]) == 14 and d["recent"] and d["stock_value"] > 0


def test_warehouses_are_private(client, user, wh):
    other = register(client, "+998 93 333 44 55")
    assert client.get(f"/api/warehouses/{wh}", headers=other).status_code == 404
    assert client.get(f"/api/warehouses/{wh}/products", headers=other).status_code == 404
    assert client.get("/api/warehouses", headers=other).json() == []


def test_sample_warehouse(client, user):
    r = client.post("/api/warehouses", headers=user, json={"name": "Namuna", "with_sample": True})
    wid = r.json()["id"]
    assert len(client.get(f"/api/warehouses/{wid}/products", headers=user).json()) == 14
    assert len(client.get(f"/api/warehouses/{wid}/categories", headers=user).json()) == 5


def test_product_crud_and_movements(client, user, wh):
    base = f"/api/warehouses/{wh}"
    cat = client.post(f"{base}/categories", headers=user, json={"name": "Oziq-ovqat", "color": "amber"}).json()
    assert client.post(f"{base}/categories", headers=user, json={"name": "Oziq-ovqat"}).status_code == 409
    data = {"name": "Guruch 25 kg", "sku": "G-1", "category_id": cat["id"], "unit": "qop",
            "cost_price": 470000, "sale_price": 520000, "min_quantity": 10, "initial_quantity": 50}
    p = client.post(f"{base}/products", headers=user, json=data)
    assert p.status_code == 201 and p.json()["quantity"] == 50
    pid = p.json()["id"]
    assert client.post(f"{base}/products", headers=user, json=data).status_code == 409  # SKU band

    mv = lambda t, q: client.post(f"{base}/movements", headers=user, json={"product_id": pid, "type": t, "quantity": q})  # noqa: E731
    r = mv("out", 45)
    assert r.status_code == 201 and r.json()["balance_after"] == 5 and r.json()["price"] == 520000
    assert mv("out", 6).status_code == 409          # qoldiqdan ko'p
    assert mv("in", 0).status_code == 400
    assert mv("in", 20).json()["balance_after"] == 25
    r = mv("adjust", 23)                             # inventarizatsiya: 2 ta kam chiqdi
    assert r.json()["delta"] == -2 and r.json()["balance_after"] == 23

    low = client.get(f"{base}/products?stock=low", headers=user).json()
    assert low == []
    assert len(client.get(f"{base}/movements?type=in", headers=user).json()) == 2  # boshlang'ich + kirim

    upd = client.put(f"{base}/products/{pid}", headers=user, json={**data, "min_quantity": 30, "sku": "G-1"})
    assert upd.json()["quantity"] == 23 and upd.json()["min_quantity"] == 30   # PUT qoldiqni o'zgartirmaydi
    d = client.get(f"{base}/dashboard", headers=user).json()
    assert d["low_stock_count"] == 1 and d["stock_value"] == 23 * 470000

    csv = client.get(f"{base}/products/export", headers=user)
    assert csv.status_code == 200 and "Guruch 25 kg" in csv.text

    assert client.delete(f"{base}/products/{pid}", headers=user).status_code == 204
    hist = client.get(f"{base}/movements", headers=user).json()
    assert len(hist) == 4 and hist[0]["product_id"] is None  # tarix saqlanadi
    assert client.request("DELETE", base, headers=user, json={"password": "xato"}).status_code == 400
    assert client.request("DELETE", base, headers=user, json={"password": "secret12"}).status_code == 204
    assert client.get(f"{base}", headers=user).status_code == 404


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "database": "ok"}


def test_debts_flow(client, user, wh):
    from datetime import timedelta

    from app.timeutil import today as tashkent_today
    base = f"/api/warehouses/{wh}"
    today = tashkent_today()
    # Yangi mijoz bilan qarz yozish
    r = client.post(f"{base}/debts", headers=user, json={
        "customer_name": "Baraka do‘koni", "customer_phone": "+998 90 111 22 33",
        "description": "Guruch 10 qop", "amount": 5_000_000, "due_date": str(today + timedelta(days=7))})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["status"] == "open" and d["remaining"] == 5_000_000 and d["customer"]["phone"] == "+998901112233"
    # Xuddi shu telefon — o'sha mijoz qayta ishlatiladi
    r2 = client.post(f"{base}/debts", headers=user, json={
        "customer_name": "Baraka", "customer_phone": "+998901112233", "description": "Shakar", "amount": 1_000_000,
        "given_date": str(today - timedelta(days=10)), "due_date": str(today - timedelta(days=2))})
    assert r2.json()["customer"]["id"] == d["customer"]["id"] and r2.json()["status"] == "overdue"
    assert len(client.get(f"{base}/customers", headers=user).json()) == 1

    # To'lovlar: qisman, ortiqcha (409), to'liq
    pay = lambda did, a: client.post(f"{base}/debts/{did}/payments", headers=user, json={"amount": a})  # noqa: E731
    assert pay(d["id"], 2_000_000).json()["remaining"] == 3_000_000
    assert pay(d["id"], 3_500_000).status_code == 409
    full = pay(d["id"], 3_000_000).json()
    assert full["status"] == "paid" and len(full["payments"]) == 2
    assert pay(d["id"], 1).status_code == 409
    # To'lovni bekor qilish
    undone = client.delete(f"{base}/debts/{d['id']}/payments/{full['payments'][0]['id']}", headers=user).json()
    assert undone["remaining"] == 3_000_000 and undone["status"] == "open"

    # Filtrlar, xulosa, bildirishnomalar
    assert [x["id"] for x in client.get(f"{base}/debts?filter=overdue", headers=user).json()] == [r2.json()["id"]]
    s = client.get(f"{base}/debts/summary", headers=user).json()
    assert s["outstanding"] == 4_000_000 and s["overdue_count"] == 1 and s["debtors_count"] == 1
    n = client.get("/api/notifications", headers=user).json()
    assert len(n) == 1 and n[0]["kind"] == "overdue" and n[0]["days_left"] == -2

    # Validatsiya
    bad = client.post(f"{base}/debts", headers=user, json={"description": "x", "amount": 10})
    assert bad.status_code == 422
    assert client.put(f"{base}/debts/{d['id']}", headers=user, json={
        "description": "x", "amount": 1_000_000, "given_date": str(today)}).status_code == 400  # to'langandan kam
    assert client.post(f"{base}/debts/{d['id']}/remind", headers=user).json()["reminded_at"]


def test_out_movement_on_credit(client, user, wh):
    base = f"/api/warehouses/{wh}"
    p = client.post(f"{base}/products", headers=user, json={"name": "Shakar 50 kg", "sku": "S-1", "unit": "qop",
                                                             "cost_price": 560000, "sale_price": 610000, "initial_quantity": 20}).json()
    r = client.post(f"{base}/movements", headers=user, json={
        "product_id": p["id"], "type": "out", "quantity": 5, "debt": {"customer_name": "Oila market"}})
    assert r.status_code == 201 and r.json()["debt_id"] and r.json()["counterparty"] == "Oila market"
    debts = client.get(f"{base}/debts", headers=user).json()
    assert debts[0]["amount"] == 5 * 610000 and debts[0]["movement_id"] == r.json()["id"]
    # Kirimni qarzga yozib bo'lmaydi
    assert client.post(f"{base}/movements", headers=user, json={
        "product_id": p["id"], "type": "in", "quantity": 1, "debt": {"customer_name": "X"}}).status_code == 400
    # Qoldiq yetmasa — qarz ham yozilmaydi
    assert client.post(f"{base}/movements", headers=user, json={
        "product_id": p["id"], "type": "out", "quantity": 99, "debt": {"customer_name": "Y"}}).status_code == 409
    assert len(client.get(f"{base}/debts", headers=user).json()) == 1


def test_russian_messages(client, user):
    r = client.post("/api/auth/login", json={"phone": "+998911112233", "password": "xato!!"}, headers={"Accept-Language": "ru"})
    assert r.json()["detail"] == "Неверный телефон или пароль"
    r = client.post("/api/auth/login", json={"phone": "+998911112233", "password": "xato!!"})
    assert r.json()["detail"] == "Telefon yoki parol noto‘g‘ri"


def test_demo_has_debts(client):
    h = {"Authorization": f"Bearer {client.post('/api/auth/login', json={'phone': '+998900000000', 'password': 'demo123'}).json()['access_token']}"}
    wid = client.get("/api/warehouses", headers=h).json()[0]["id"]
    s = client.get(f"/api/warehouses/{wid}/debts/summary", headers=h).json()
    assert s["overdue_count"] == 1 and s["due_today_count"] == 1 and s["debtors_count"] == 4


# ---------- Xavfsizlik ----------
def test_weak_password_rejected(client):
    r = client.post("/api/auth/register", json={"name": "Ali", "phone": "+998901234567", "password": "123"})
    assert r.status_code == 422 and "8" in r.json()["detail"]


def test_friendly_validation_message(client):
    r = client.post("/api/auth/register", json={"name": "A", "phone": "+998901234567", "password": "secret12"})
    assert r.status_code == 422
    assert r.json()["detail"] == "«Nomi» kamida 2 ta belgi bo‘lsin"
    r = client.post("/api/auth/register", headers={"Accept-Language": "ru"}, json={"name": "A", "phone": "+998901234567", "password": "secret12"})
    assert "Название" in r.json()["detail"]


def test_password_hashed_and_security_headers(client, user):
    from app.database import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).filter(User.phone == "+998911112233").one()
        assert u.password_hash.startswith("$2") and "secret12" not in u.password_hash
    r = client.get("/api/auth/me", headers=user)
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["cache-control"] == "no-store"


def test_login_rate_limit(client, user):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"phone": "+998911112233", "password": "xato1234"}).status_code == 401
    r = client.post("/api/auth/login", json={"phone": "+998911112233", "password": "secret12"})
    assert r.status_code == 429 and "daqiqa" in r.json()["detail"]


def test_change_password_revokes_old_tokens(client, user):
    r = client.post("/api/auth/password", headers=user, json={"current_password": "noto'g'ri1", "new_password": "yangiParol9"})
    assert r.status_code == 400
    r = client.post("/api/auth/password", headers=user, json={"current_password": "secret12", "new_password": "yangiParol9"})
    assert r.status_code == 200
    new = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/auth/me", headers=user).status_code == 401      # eski token endi ishlamaydi
    assert client.get("/api/auth/me", headers=new).status_code == 200
    assert client.post("/api/auth/login", json={"phone": "+998911112233", "password": "yangiParol9"}).status_code == 200


def test_logout_all(client, user):
    r = client.post("/api/auth/logout-all", headers=user)
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers=user).status_code == 401


def test_export_and_delete_account(client, user, wh):
    r = client.get("/api/auth/export", headers=user)
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    assert r.json()["warehouses"][0]["name"] == "Test ombor"
    assert client.request("DELETE", "/api/auth/me", headers=user, json={"password": "xato"}).status_code == 400
    assert client.request("DELETE", "/api/auth/me", headers=user, json={"password": "secret12"}).status_code == 204
    assert client.get("/api/auth/me", headers=user).status_code == 401


def test_demo_protected_and_resets(client):
    r = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"})
    demo = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.post("/api/auth/password", headers=demo, json={"current_password": "demo123", "new_password": "boshqa123"}).status_code == 403
    whs = client.get("/api/warehouses", headers=demo).json()
    for w in whs:
        assert client.request("DELETE", f"/api/warehouses/{w['id']}", headers=demo, json={"password": "demo123"}).status_code == 204
    assert client.get("/api/warehouses", headers=demo).json() == []
    from datetime import datetime, timedelta, timezone
    from app.database import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).filter(User.phone == "+998900000000").one()
        u.demo_reset_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    client.post("/api/auth/login", json={"phone": "+998900000000", "password": "demo123"})
    assert len(client.get("/api/warehouses", headers=demo).json()) == 2
