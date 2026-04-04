from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class StockOut(BaseModel):
    id: int
    ingrediente_id: int
    cantidad_disponible: Decimal
    cantidad_minima: Decimal
    ultima_actualizacion: datetime

    class Config:
        from_attributes = True


class MovimientoStockCreate(BaseModel):
    ingrediente_id: int
    tipo: str  # "entrada" | "salida"
    cantidad: Decimal
    referencia: str | None = None
    notas: str | None = None


class MovimientoStockOut(MovimientoStockCreate):
    id: int
    fecha: datetime

    class Config:
        from_attributes = True
