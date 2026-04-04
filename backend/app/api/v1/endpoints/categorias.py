from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.categoria import Categoria

router = APIRouter(prefix="/categorias", tags=["categorias"])


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None = None
    activo: bool

    class Config:
        from_attributes = True


class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: str | None = None


@router.get("/", response_model=list[CategoriaOut])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).filter(Categoria.activo == True).all()


@router.post("/", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(data: CategoriaCreate, db: Session = Depends(get_db)):
    if db.query(Categoria).filter(Categoria.nombre == data.nombre).first():
        raise HTTPException(status_code=400, detail="Ya existe esa categoría")
    cat = Categoria(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
