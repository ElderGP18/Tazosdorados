from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.feriado import Feriado
from app.schemas.feriado import FeriadoCreate, FeriadoOut, FeriadoUpdate

router = APIRouter(prefix="/feriados", tags=["feriados"])


@router.get("/", response_model=list[FeriadoOut])
def listar_feriados(db: Session = Depends(get_db)):
    return db.query(Feriado).order_by(Feriado.fecha).all()


@router.post("/", response_model=FeriadoOut, status_code=status.HTTP_201_CREATED)
def crear_feriado(data: FeriadoCreate, db: Session = Depends(get_db)):
    if db.query(Feriado).filter(Feriado.fecha == data.fecha).first():
        raise HTTPException(status_code=400, detail="Ya existe un feriado para esa fecha")
    feriado = Feriado(**data.model_dump())
    db.add(feriado)
    db.commit()
    db.refresh(feriado)
    return feriado


@router.patch("/{feriado_id}", response_model=FeriadoOut)
def actualizar_feriado(feriado_id: int, data: FeriadoUpdate, db: Session = Depends(get_db)):
    feriado = db.query(Feriado).filter(Feriado.id == feriado_id).first()
    if not feriado:
        raise HTTPException(status_code=404, detail="Feriado no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(feriado, field, value)
    db.commit()
    db.refresh(feriado)
    return feriado


@router.delete("/{feriado_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_feriado(feriado_id: int, db: Session = Depends(get_db)):
    feriado = db.query(Feriado).filter(Feriado.id == feriado_id).first()
    if not feriado:
        raise HTTPException(status_code=404, detail="Feriado no encontrado")
    db.delete(feriado)
    db.commit()
