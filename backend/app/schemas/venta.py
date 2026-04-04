from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, model_validator


class DetalleVentaCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: Decimal

    @model_validator(mode="after")
    def calcular_subtotal(self):
        self.subtotal = self.cantidad * self.precio_unitario
        return self

    subtotal: Decimal = Decimal("0")


class DetalleVentaOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


class VentaCreate(BaseModel):
    metodo_pago: str = "efectivo"
    notas: str | None = None
    detalles: list[DetalleVentaCreate]


class VentaOut(BaseModel):
    id: int
    fecha: datetime
    total: Decimal
    metodo_pago: str
    usuario_id: int | None
    notas: str | None
    detalles: list[DetalleVentaOut]
    created_at: datetime

    class Config:
        from_attributes = True
