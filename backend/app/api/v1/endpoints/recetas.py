from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.models.receta import RecetaDetalle

router = APIRouter(prefix="/recetas", tags=["recetas"])


class RecetaOut(BaseModel):
    id: int
    producto_id: int
    ingrediente_id: int
    cantidad: Decimal

    class Config:
        from_attributes = True


class RecetaCreate(BaseModel):
    producto_id: int
    ingrediente_id: int
    cantidad: Decimal


@router.get("/", response_model=list[RecetaOut])
def listar_recetas(producto_id: int | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(RecetaDetalle)
    if producto_id:
        q = q.filter(RecetaDetalle.producto_id == producto_id)
    return q.all()


@router.post("/", response_model=RecetaOut, status_code=status.HTTP_201_CREATED)
def crear_receta(data: RecetaCreate, db: Session = Depends(get_db)):
    existing = db.query(RecetaDetalle).filter_by(
        producto_id=data.producto_id, ingrediente_id=data.ingrediente_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe esa combinación producto-ingrediente")
    rec = RecetaDetalle(**data.model_dump())
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{receta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_receta(receta_id: int, db: Session = Depends(get_db)):
    rec = db.query(RecetaDetalle).filter(RecetaDetalle.id == receta_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(rec)
    db.commit()
