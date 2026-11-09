import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://ombor:ombor@localhost:5432/ombor_test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:  # lifespan: create tables + seed
        yield c
    Base.metadata.drop_all(engine)


def auth(c: TestClient, phone: str, password: str) -> dict:
    r = c.post("/api/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(client):
    return auth(client, "+998900000000", "admin123")


@pytest.fixture()
def customer(client):
    r = client.post("/api/auth/register", json={"name": "Mijoz", "phone": "+998 91 111 22 33", "password": "secret12"})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
