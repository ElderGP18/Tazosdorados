"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-02 00:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(50), nullable=False, unique=True),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("email", sa.String(150), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("rol_id", sa.Integer, sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "categorias",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(80), nullable=False, unique=True),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "productos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("descripcion", sa.Text, nullable=True),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("categoria_id", sa.Integer, sa.ForeignKey("categorias.id"), nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )

    op.create_table(
        "ingredientes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(120), nullable=False, unique=True),
        sa.Column("unidad_medida", sa.String(20), nullable=False),
        sa.Column("costo_unitario", sa.Numeric(10, 4), nullable=False, server_default="0"),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )

    op.create_table(
        "recetas_detalle",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("producto_id", sa.Integer, sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("ingrediente_id", sa.Integer, sa.ForeignKey("ingredientes.id"), nullable=False),
        sa.Column("cantidad", sa.Numeric(10, 4), nullable=False),
        sa.UniqueConstraint("producto_id", "ingrediente_id", name="uq_receta_producto_ingrediente"),
    )

    op.create_table(
        "ventas",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("fecha", sa.DateTime, nullable=False, server_default=sa.func.now(), index=True),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("metodo_pago", sa.String(30), nullable=False, server_default="efectivo"),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "detalles_venta",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("venta_id", sa.Integer, sa.ForeignKey("ventas.id"), nullable=False),
        sa.Column("producto_id", sa.Integer, sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("cantidad", sa.Integer, nullable=False),
        sa.Column("precio_unitario", sa.Numeric(10, 2), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
    )

    op.create_table(
        "stock",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("ingrediente_id", sa.Integer, sa.ForeignKey("ingredientes.id"),
                  nullable=False, unique=True),
        sa.Column("cantidad_disponible", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("cantidad_minima", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("ultima_actualizacion", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "movimientos_stock",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("ingrediente_id", sa.Integer, sa.ForeignKey("ingredientes.id"), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("cantidad", sa.Numeric(12, 4), nullable=False),
        sa.Column("referencia", sa.String(100), nullable=True),
        sa.Column("notas", sa.Text, nullable=True),
        sa.Column("fecha", sa.DateTime, nullable=False, server_default=sa.func.now(), index=True),
    )

    op.create_table(
        "feriados",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("fecha", sa.Date, nullable=False, unique=True),
        sa.Column("descripcion", sa.String(200), nullable=False),
        sa.Column("tipo", sa.String(40), nullable=False, server_default="nacional"),
        sa.Column("afecta_demanda", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("feriados")
    op.drop_table("movimientos_stock")
    op.drop_table("stock")
    op.drop_table("detalles_venta")
    op.drop_table("ventas")
    op.drop_table("recetas_detalle")
    op.drop_table("ingredientes")
    op.drop_table("productos")
    op.drop_table("categorias")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_table("roles")
