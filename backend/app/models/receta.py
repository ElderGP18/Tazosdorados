from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RecetaDetalle(Base):
    """Tabla pivot producto <-> ingrediente con la cantidad requerida por porción."""

    __tablename__ = "recetas_detalle"
    __table_args__ = (
        UniqueConstraint("producto_id", "ingrediente_id", name="uq_receta_producto_ingrediente"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    ingrediente_id: Mapped[int] = mapped_column(ForeignKey("ingredientes.id"), nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)

    producto: Mapped["Producto"] = relationship("Producto", back_populates="recetas")
    ingrediente: Mapped["Ingrediente"] = relationship("Ingrediente", back_populates="recetas")
