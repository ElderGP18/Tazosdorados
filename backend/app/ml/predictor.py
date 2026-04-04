"""
Genera predicciones de demanda usando el modelo entrenado.
"""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.features import FEATURE_COLS, build_future_row
from app.ml.loader import cargar_ventas_diarias, cargar_proporciones_productos, cargar_feriados
from app.ml.trainer import cargar_modelo, modelo_disponible


def _predecir_dia(
    target: pd.Timestamp,
    history: pd.DataFrame,
    holidays: set[str],
    model,
) -> float:
    """Predice las unidades totales para un día dado."""
    row = build_future_row(target, history, holidays)
    X = row[FEATURE_COLS].values
    pred = float(model.predict(X)[0])
    return max(0.0, round(pred, 1))


def _desglose_por_producto(
    total_units: float,
    proporciones: pd.DataFrame,
) -> list[dict]:
    """Distribuye el total predicho según proporciones históricas."""
    resultado = []
    for _, fila in proporciones.iterrows():
        unidades = round(total_units * float(fila["proporcion"]), 1)
        resultado.append({
            "producto_id":        int(fila["producto_id"]),
            "nombre":             fila["nombre"],
            "unidades_predichas": unidades,
            "porcentaje":         round(float(fila["proporcion"]) * 100, 1),
        })
    return resultado


def predecir_dia(db: Session, fecha: date) -> dict:
    """
    Predicción de demanda para un único día.
    Devuelve total y desglose por producto.
    """
    if not modelo_disponible():
        raise RuntimeError(
            "Modelo no disponible. Entrena primero con POST /api/v1/predicciones/reentrenar"
        )

    model       = cargar_modelo()
    history     = cargar_ventas_diarias(db)
    holidays    = cargar_feriados(db)
    proporciones = cargar_proporciones_productos(db)

    target = pd.Timestamp(fecha)
    total  = _predecir_dia(target, history, holidays, model)
    productos = _desglose_por_producto(total, proporciones)

    return {
        "fecha":            str(fecha),
        "total_unidades":   total,
        "productos":        productos,
    }


def predecir_rango(db: Session, fecha_inicio: date, dias: int = 7) -> list[dict]:
    """
    Predicción para los próximos N días.
    Cada día predicho se agrega al historial para alimentar el siguiente (encadenamiento).
    """
    if not modelo_disponible():
        raise RuntimeError(
            "Modelo no disponible. Entrena primero con POST /api/v1/predicciones/reentrenar"
        )

    model        = cargar_modelo()
    history      = cargar_ventas_diarias(db).copy()
    holidays     = cargar_feriados(db)
    proporciones = cargar_proporciones_productos(db)

    resultados = []
    for offset in range(dias):
        fecha  = fecha_inicio + timedelta(days=offset)
        target = pd.Timestamp(fecha)
        total  = _predecir_dia(target, history, holidays, model)

        # Encadenar: el predicho alimenta el siguiente paso
        nueva_fila = pd.DataFrame([{"date": target, "units_sold": total}])
        history = pd.concat([history, nueva_fila], ignore_index=True)

        productos = _desglose_por_producto(total, proporciones)
        resultados.append({
            "fecha":          str(fecha),
            "total_unidades": total,
            "productos":      productos,
        })

    return resultados
