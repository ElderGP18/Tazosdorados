from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    metodo_pago: Mapped[str] = mapped_column(String(30), nullable=False, default="efectivo")
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="ventas")
    detalles: Mapped[list["DetalleVenta"]] = relationship(
        "DetalleVenta", back_populates="venta", cascade="all, delete-orphan"
    )


class DetalleVenta(Base):
    __tablename__ = "detalles_venta"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    venta: Mapped["Venta"] = relationship("Venta", back_populates="detalles")
    producto: Mapped["Producto"] = relationship("Producto", back_populates="detalles_venta")
