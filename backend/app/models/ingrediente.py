from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Ingrediente(Base):
    __tablename__ = "ingredientes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(20), nullable=False)  # kg, g, L, ml, unidad
    costo_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    recetas: Mapped[list["RecetaDetalle"]] = relationship("RecetaDetalle", back_populates="ingrediente")
    stock: Mapped["Stock"] = relationship("Stock", back_populates="ingrediente", uselist=False)
    movimientos_stock: Mapped[list["MovimientoStock"]] = relationship(
        "MovimientoStock", back_populates="ingrediente"
    )
