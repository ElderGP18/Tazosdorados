from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.rol import Rol

router = APIRouter(prefix="/roles", tags=["roles"])


class RolOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    activo: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=list[RolOut])
def listar_roles(db: Session = Depends(get_db)):
    return db.query(Rol).filter(Rol.activo == True).all()
