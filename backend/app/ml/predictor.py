"""
Genera predicciones de demanda usando modelo híbrido:
- Con pocos datos (<60 días): media por día de semana × factor tendencia reciente
- Con suficientes datos (>=60 días): combinación ponderada de estadístico + GBR

Esto asegura que Vie/Sáb/Dom siempre se predigan más altos si el historial lo muestra.
"""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.ml.features import FEATURE_COLS, build_future_row
from app.ml.loader import cargar_ventas_diarias, cargar_proporciones_productos, cargar_feriados
from app.ml.trainer import cargar_modelo, modelo_disponible

_DIAS_SUFICIENTES_PARA_ML = 60
_DIAS_PLENA_CONFIANZA_ML  = 120


def _compute_dow_avgs(history: pd.DataFrame) -> dict[int, float]:
    """Media de unidades vendidas por día de semana (0=Lun … 6=Dom)."""
    if history.empty:
        return {}
    h = history.copy()
    h["dow"] = h["date"].dt.dayofweek
    return h.groupby("dow")["units_sold"].mean().to_dict()


def _hybrid_predict(
    target: pd.Timestamp,
    history: pd.DataFrame,
    holidays: set[str],
    dow_avgs: dict[int, float],
    model,
) -> float:
    """
    Predicción híbrida: media-DOW × tendencia_reciente + mezcla con GBR.
    Con pocos datos confía 100% en la estadística DOW; el ML gana peso gradualmente.
    """
    dow   = target.dayofweek
    n_dias = len(history)

    overall_avg = float(history["units_sold"].mean()) if n_dias > 0 else 0.0
    dow_avg = dow_avgs.get(dow, overall_avg)

    # Tendencia reciente vs histórico general (capped 0.5–2.5×)
    if overall_avg > 0 and n_dias >= 7:
        recent_mean = float(history["units_sold"].tail(14).mean())
        trend = max(0.5, min(2.5, recent_mean / overall_avg))
    else:
        trend = 1.0

    stat_pred = dow_avg * trend

    if model is not None and n_dias >= _DIAS_SUFICIENTES_PARA_ML:
        row = build_future_row(target, history, holidays)
        X   = row[FEATURE_COLS].values
        ml_pred = max(0.0, float(model.predict(X)[0]))
        ramp  = (n_dias - _DIAS_SUFICIENTES_PARA_ML) / (_DIAS_PLENA_CONFIANZA_ML - _DIAS_SUFICIENTES_PARA_ML)
        alpha = min(0.7, ramp * 0.7)
        final = (1 - alpha) * stat_pred + alpha * ml_pred
    else:
        final = stat_pred

    return max(0.0, round(final, 1))


def _desglose_por_producto(
    total_units: float,
    proporciones: pd.DataFrame,
) -> list[dict]:
    """Distribuye el total predicho según proporciones históricas, con categoría."""
    resultado = []
    for _, fila in proporciones.iterrows():
        unidades = round(total_units * float(fila["proporcion"]), 1)
        if unidades <= 0:
            continue
        resultado.append({
            "producto_id":        int(fila["producto_id"]),
            "nombre":             fila["nombre"],
            "categoria_id":       int(fila.get("categoria_id", 0)),
            "categoria":          str(fila.get("categoria", "Otros")),
            "unidades_predichas": unidades,
            "porcentaje":         round(float(fila["proporcion"]) * 100, 1),
        })
    return resultado


def predecir_dia(db: Session, fecha: date) -> dict:
    if not modelo_disponible():
        raise RuntimeError(
            "Modelo no disponible. Entrena primero con POST /api/v1/predicciones/reentrenar"
        )

    model        = cargar_modelo()
    history      = cargar_ventas_diarias(db)
    holidays     = cargar_feriados(db)
    proporciones = cargar_proporciones_productos(db)
    dow_avgs     = _compute_dow_avgs(history)

    target   = pd.Timestamp(fecha)
    total    = _hybrid_predict(target, history, holidays, dow_avgs, model)
    productos = _desglose_por_producto(total, proporciones)

    return {"fecha": str(fecha), "total_unidades": total, "productos": productos}


def predecir_rango(db: Session, fecha_inicio: date, dias: int = 7) -> list[dict]:
    """
    Predicción para los próximos N días.
    Cada día predicho se encadena al historial para alimentar el siguiente.
    """
    if not modelo_disponible():
        raise RuntimeError(
            "Modelo no disponible. Entrena primero con POST /api/v1/predicciones/reentrenar"
        )

    model        = cargar_modelo()
    history      = cargar_ventas_diarias(db).copy()
    holidays     = cargar_feriados(db)
    proporciones = cargar_proporciones_productos(db)
    dow_avgs     = _compute_dow_avgs(history)

    resultados = []
    for offset in range(dias):
        fecha  = fecha_inicio + timedelta(days=offset)
        target = pd.Timestamp(fecha)
        total  = _hybrid_predict(target, history, holidays, dow_avgs, model)

        nueva_fila = pd.DataFrame([{"date": target, "units_sold": total}])
        history    = pd.concat([history, nueva_fila], ignore_index=True)

        productos = _desglose_por_producto(total, proporciones)
        resultados.append({
            "fecha":          str(fecha),
            "total_unidades": total,
            "productos":      productos,
        })

    return resultados
