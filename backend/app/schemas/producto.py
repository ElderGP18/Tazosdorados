from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class ProductoBase(BaseModel):
    nombre: str
    descripcion: str | None = None
    precio: Decimal
    categoria_id: int | None = None


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    precio: Decimal | None = None
    categoria_id: int | None = None
    activo: bool | None = None


class ProductoOut(ProductoBase):
    id: int
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True
