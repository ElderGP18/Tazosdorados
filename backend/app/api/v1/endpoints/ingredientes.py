from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.ingrediente import Ingrediente
from app.schemas.ingrediente import IngredienteCreate, IngredienteOut, IngredienteUpdate

router = APIRouter(prefix="/ingredientes", tags=["ingredientes"])


@router.get("/", response_model=list[IngredienteOut])
def listar_ingredientes(
    solo_activos: bool = True, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    query = db.query(Ingrediente)
    if solo_activos:
        query = query.filter(Ingrediente.activo == True)
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=IngredienteOut, status_code=status.HTTP_201_CREATED)
def crear_ingrediente(data: IngredienteCreate, db: Session = Depends(get_db)):
    if db.query(Ingrediente).filter(Ingrediente.nombre == data.nombre).first():
        raise HTTPException(status_code=400, detail="Ya existe un ingrediente con ese nombre")
    ingrediente = Ingrediente(**data.model_dump())
    db.add(ingrediente)
    db.commit()
    db.refresh(ingrediente)
    return ingrediente


@router.get("/{ingrediente_id}", response_model=IngredienteOut)
def obtener_ingrediente(ingrediente_id: int, db: Session = Depends(get_db)):
    ing = db.query(Ingrediente).filter(Ingrediente.id == ingrediente_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    return ing


@router.patch("/{ingrediente_id}", response_model=IngredienteOut)
def actualizar_ingrediente(
    ingrediente_id: int, data: IngredienteUpdate, db: Session = Depends(get_db)
):
    ing = db.query(Ingrediente).filter(Ingrediente.id == ingrediente_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingrediente no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ing, field, value)
    db.commit()
    db.refresh(ing)
    return ing
