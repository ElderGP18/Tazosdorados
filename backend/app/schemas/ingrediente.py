from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class IngredienteBase(BaseModel):
    nombre: str
    unidad_medida: str
    costo_unitario: Decimal = Decimal("0")


class IngredienteCreate(IngredienteBase):
    pass


class IngredienteUpdate(BaseModel):
    nombre: str | None = None
    unidad_medida: str | None = None
    costo_unitario: Decimal | None = None
    activo: bool | None = None


class IngredienteOut(IngredienteBase):
    id: int
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True
