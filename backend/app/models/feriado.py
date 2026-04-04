from datetime import date, datetime, timezone
from sqlalchemy import Date, String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Feriado(Base):
    """
    Días feriados o eventos especiales.
    Usado por el módulo de predicción de demanda para ajustar proyecciones.
    """

    __tablename__ = "feriados"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    descripcion: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False, default="nacional")
    # nacional | regional | evento_especial | cierre
    afecta_demanda: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
