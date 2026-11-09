def test_register_duplicate_phone(client, customer):
    r = client.post("/api/auth/register", json={"name": "Boshqa", "phone": "+998911112233", "password": "secret12"})
    assert r.status_code == 409


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"phone": "+998900000000", "password": "wrong!!"})
    assert r.status_code == 401


def test_catalog_filters(client):
    assert len(client.get("/api/products").json()) == 16
    assert {p["sku"] for p in client.get("/api/products?category=elektr").json()} == {"EL-001", "EL-002"}
    assert all(p["stock"] > 0 for p in client.get("/api/products?in_stock=true").json())
    assert client.get("/api/products/9999").status_code == 404


def test_order_uses_tier_price_and_decrements_stock(client, customer):
    r = client.post("/api/orders", headers=customer, json={"items": [{"product_id": 1, "qty": 20}], "address": "Toshkent sh."})
    assert r.status_code == 201
    assert r.json()["items"][0]["unit_price"] == 505000  # 20+ pog‘ona
    assert r.json()["total"] == 20 * 505000
    assert client.get("/api/products/1").json()["stock"] == 400


def test_order_validation(client, customer):
    body = {"address": "Toshkent sh."}
    assert client.post("/api/orders", json={**body, "items": [{"product_id": 1, "qty": 5}]}).status_code == 401
    assert client.post("/api/orders", headers=customer, json={**body, "items": [{"product_id": 1, "qty": 2}]}).status_code == 400  # MOQ
    assert client.post("/api/orders", headers=customer, json={**body, "items": [{"product_id": 1, "qty": 9999}]}).status_code == 409  # stock
    assert client.post("/api/orders", headers=customer, json={**body, "items": []}).status_code == 422


def test_admin_requires_role(client, customer):
    assert client.get("/api/admin/stats", headers=customer).status_code == 403
    assert client.get("/api/admin/stats").status_code == 401


def test_cancel_returns_stock(client, admin, customer):
    oid = client.post("/api/orders", headers=customer, json={"items": [{"product_id": 2, "qty": 10}], "address": "Toshkent sh."}).json()["id"]
    assert client.get("/api/products/2").json()["stock"] == 290
    r = client.patch(f"/api/admin/orders/{oid}", headers=admin, json={"status": "cancelled"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert client.get("/api/products/2").json()["stock"] == 300


def test_product_crud(client, admin):
    data = {"name": "Un 50 kg", "sku": "OZ-100", "base_price": 380000, "stock": 10, "moq": 2, "category_id": 1,
            "tiers": [{"min_qty": 30, "price": 365000}]}
    r = client.post("/api/admin/products", headers=admin, json=data)
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.post("/api/admin/products", headers=admin, json=data).status_code == 409  # SKU band
    assert client.post("/api/admin/products", headers=admin, json={**data, "sku": "X", "tiers": [{"min_qty": 5, "price": 999999}]}).status_code == 422
    r = client.put(f"/api/admin/products/{pid}", headers=admin, json={**data, "base_price": 390000, "tiers": []})
    assert r.json()["base_price"] == 390000 and r.json()["tiers"] == []
    assert client.patch(f"/api/admin/products/{pid}/stock", headers=admin, json={"delta": -100}).json()["stock"] == 0
    assert client.delete(f"/api/admin/products/{pid}", headers=admin).status_code == 204
    assert client.get(f"/api/products/{pid}").status_code == 404
