"""
Carga y prepara el historial de ventas desde MySQL para el módulo ML.
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text


def cargar_ventas_diarias(db: Session) -> pd.DataFrame:
    """
    Devuelve un DataFrame con unidades pagadas vendidas por día.
    Excluye garniciones/extras gratis (precio_unitario = 0) para que
    la métrica refleje demanda real, no relleno automático.

    Columnas: date, units_sold
    """
    sql = text("""
        SELECT
            DATE(v.fecha)       AS date,
            SUM(dv.cantidad)    AS units_sold
        FROM ventas v
        JOIN detalles_venta dv ON dv.venta_id = v.id
        WHERE dv.precio_unitario > 0
        GROUP BY DATE(v.fecha)
        ORDER BY date ASC
    """)
    rows = db.execute(sql).fetchall()
    if not rows:
        return pd.DataFrame(columns=["date", "units_sold"])

    df = pd.DataFrame(rows, columns=["date", "units_sold"])
    df["date"] = pd.to_datetime(df["date"])
    df["units_sold"] = df["units_sold"].astype(float)
    return df


def cargar_proporciones_productos(db: Session, dias: int = 60) -> pd.DataFrame:
    """
    Proporción histórica de unidades vendidas por producto en los últimos N días.
    Excluye extras gratis. Incluye categoria_id y categoria para agrupar en el frontend.

    Columnas: producto_id, nombre, categoria_id, categoria, proporcion
    """
    sql = text("""
        SELECT
            p.id            AS producto_id,
            p.nombre        AS nombre,
            COALESCE(c.id, 0)      AS categoria_id,
            COALESCE(c.nombre, 'Otros') AS categoria,
            SUM(dv.cantidad) AS total
        FROM detalles_venta dv
        JOIN ventas v    ON v.id  = dv.venta_id
        JOIN productos p ON p.id = dv.producto_id
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL :dias DAY)
          AND dv.precio_unitario > 0
        GROUP BY p.id, p.nombre, c.id, c.nombre
        ORDER BY total DESC
    """)
    rows = db.execute(sql, {"dias": dias}).fetchall()
    if not rows:
        return pd.DataFrame(columns=["producto_id", "nombre", "categoria_id", "categoria", "proporcion"])

    df = pd.DataFrame(rows, columns=["producto_id", "nombre", "categoria_id", "categoria", "total"])
    df["total"] = df["total"].astype(float)
    total_sum = df["total"].sum()
    df["proporcion"] = df["total"] / total_sum if total_sum > 0 else 0.0
    return df[["producto_id", "nombre", "categoria_id", "categoria", "proporcion"]]


def cargar_feriados(db: Session) -> set[str]:
    """Devuelve un conjunto de fechas feriadas (YYYY-MM-DD) que afectan la demanda."""
    sql = text("SELECT fecha FROM feriados WHERE afecta_demanda = 1")
    rows = db.execute(sql).fetchall()
    return {str(r[0]) for r in rows}
