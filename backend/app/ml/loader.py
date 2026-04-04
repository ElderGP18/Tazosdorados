"""
Carga y prepara el historial de ventas desde MySQL para el módulo ML.
"""
from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text


def cargar_ventas_diarias(db: Session) -> pd.DataFrame:
    """
    Devuelve un DataFrame con las unidades totales vendidas por día.

    Columnas: date, units_sold
    """
    sql = text("""
        SELECT
            DATE(v.fecha)          AS date,
            SUM(dv.cantidad)       AS units_sold
        FROM ventas v
        JOIN detalles_venta dv ON dv.venta_id = v.id
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


def cargar_proporciones_productos(db: Session, dias: int = 30) -> pd.DataFrame:
    """
    Proporción histórica de unidades vendidas por producto en los últimos N días.

    Columnas: producto_id, nombre, proporcion
    """
    sql = text("""
        SELECT
            p.id                       AS producto_id,
            p.nombre                   AS nombre,
            SUM(dv.cantidad)           AS total
        FROM detalles_venta dv
        JOIN ventas v   ON v.id  = dv.venta_id
        JOIN productos p ON p.id = dv.producto_id
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL :dias DAY)
        GROUP BY p.id, p.nombre
        ORDER BY total DESC
    """)
    rows = db.execute(sql, {"dias": dias}).fetchall()
    if not rows:
        return pd.DataFrame(columns=["producto_id", "nombre", "proporcion"])

    df = pd.DataFrame(rows, columns=["producto_id", "nombre", "total"])
    df["total"] = df["total"].astype(float)
    df["proporcion"] = df["total"] / df["total"].sum()
    return df[["producto_id", "nombre", "proporcion"]]


def cargar_feriados(db: Session) -> set[str]:
    """Devuelve un conjunto de fechas feriadas (YYYY-MM-DD) que afectan la demanda."""
    sql = text("SELECT fecha FROM feriados WHERE afecta_demanda = 1")
    rows = db.execute(sql).fetchall()
    return {str(r[0]) for r in rows}
