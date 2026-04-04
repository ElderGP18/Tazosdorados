"""
Endpoints de administración interna.
Solo accesibles con la API_ADMIN_KEY definida en .env.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, check_db_connection
from app.models import Rol, Usuario, Producto, Ingrediente, RecetaDetalle, Stock, Venta

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin_key(x_admin_key: str = Header(...)):
    if x_admin_key != settings.API_ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Clave de administración inválida")


@router.get("/stats", dependencies=[Depends(require_admin_key)])
def estadisticas(db: Session = Depends(get_db)):
    """Resumen rápido del estado de la base de datos."""
    return {
        "db_connected": check_db_connection(),
        "roles": db.query(Rol).count(),
        "usuarios": db.query(Usuario).filter(Usuario.activo == True).count(),
        "productos": db.query(Producto).filter(Producto.activo == True).count(),
        "ingredientes": db.query(Ingrediente).filter(Ingrediente.activo == True).count(),
        "recetas_lineas": db.query(RecetaDetalle).count(),
        "stock_items": db.query(Stock).count(),
        "ventas_total": db.query(Venta).count(),
    }


@router.post("/seed", dependencies=[Depends(require_admin_key)])
def ejecutar_seed():
    """Ejecuta el seed de datos iniciales (idempotente)."""
    from scripts.seed import run
    run()
    return {"status": "ok", "message": "Seed ejecutado correctamente"}
