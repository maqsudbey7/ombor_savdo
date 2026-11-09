from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db
from .routers import admin, auth, catalog, orders


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    if settings.jwt_secret == "dev-secret-change-me":
        print("⚠️  JWT_SECRET o‘rnatilmagan — production’da albatta o‘zgartiring!")
    yield


app = FastAPI(
    title="OmborSavdo API",
    description="Ulgurji (omborlik) savdo platformasi uchun REST API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(x) for x in first.get("loc", [])[1:])
    msg = str(first.get("msg", "Ma’lumot noto‘g‘ri")).removeprefix("Value error, ")
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {msg}" if field else msg, "errors": jsonable(errors)},
    )


def jsonable(errors: list[dict]) -> list[dict]:
    return [{"loc": e.get("loc"), "msg": str(e.get("msg")), "type": e.get("type")} for e in errors]


for r in (auth.router, catalog.router, orders.router, admin.router):
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok"}


# Serve the built React app (frontend/dist) in production.
dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if dist.exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            return JSONResponse({"detail": "Topilmadi"}, status_code=404)
        file = dist / path
        return FileResponse(file if path and file.is_file() else dist / "index.html")
