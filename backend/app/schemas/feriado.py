from datetime import date, datetime
from pydantic import BaseModel


class FeriadoBase(BaseModel):
    fecha: date
    descripcion: str
    tipo: str = "nacional"
    afecta_demanda: bool = True


class FeriadoCreate(FeriadoBase):
    pass


class FeriadoUpdate(BaseModel):
    descripcion: str | None = None
    tipo: str | None = None
    afecta_demanda: bool | None = None


class FeriadoOut(FeriadoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
