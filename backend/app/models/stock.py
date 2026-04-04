from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Stock(Base):
    """Nivel actual de stock por ingrediente."""

    __tablename__ = "stock"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ingrediente_id: Mapped[int] = mapped_column(
        ForeignKey("ingredientes.id"), unique=True, nullable=False
    )
    cantidad_disponible: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    cantidad_minima: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False, default=0)
    ultima_actualizacion: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    ingrediente: Mapped["Ingrediente"] = relationship("Ingrediente", back_populates="stock")


class MovimientoStock(Base):
    """Historial de movimientos de stock (entradas y salidas)."""

    __tablename__ = "movimientos_stock"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ingrediente_id: Mapped[int] = mapped_column(ForeignKey("ingredientes.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # "entrada" | "salida"
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    referencia: Mapped[str | None] = mapped_column(String(100), nullable=True)  # ej: "venta_42"
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    ingrediente: Mapped["Ingrediente"] = relationship("Ingrediente", back_populates="movimientos_stock")
