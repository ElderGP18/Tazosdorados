from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    roles,
    usuarios,
    categorias,
    productos,
    ingredientes,
    recetas,
    ventas,
    stock,
    feriados,
    admin,
    predicciones,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(roles.router)
api_router.include_router(usuarios.router)
api_router.include_router(categorias.router)
api_router.include_router(productos.router)
api_router.include_router(ingredientes.router)
api_router.include_router(recetas.router)
api_router.include_router(ventas.router)
api_router.include_router(stock.router)
api_router.include_router(feriados.router)
api_router.include_router(admin.router)
api_router.include_router(predicciones.router)
