from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine, check_db_connection
from app.api.v1.router import api_router

import app.models  # noqa: F401 — registra todos los modelos en SQLAlchemy


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    if check_db_connection():
        print("DB conectada. Verificando tablas...")
        Base.metadata.create_all(bind=engine)
        print("Tablas listas.")
    else:
        print("ADVERTENCIA: No se pudo conectar a la DB al iniciar.")
    yield
    print("Servidor apagado.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["health"])
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}


@app.get("/health", tags=["health"])
def health():
    db_ok = check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
    }
