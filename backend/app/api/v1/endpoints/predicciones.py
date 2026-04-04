from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.trainer import entrenar, modelo_disponible, cargar_meta
from app.ml.predictor import predecir_dia, predecir_rango
from app.schemas.prediccion import (
    EstadoModeloOut,
    PrediccionDiaOut,
    ReentrenarOut,
)

router = APIRouter(prefix="/predicciones", tags=["predicciones"])


@router.get("/estado", response_model=EstadoModeloOut)
def estado_modelo():
    """Estado actual del modelo: si está entrenado y sus métricas."""
    disponible = modelo_disponible()
    meta = cargar_meta() if disponible else {}
    return EstadoModeloOut(
        modelo_disponible=disponible,
        entrenado_en=meta.get("entrenado_en"),
        dias_historicos=meta.get("dias_historicos"),
        dias_con_features=meta.get("dias_con_features"),
        mae_cv=meta.get("mae_cv"),
        rmse_cv=meta.get("rmse_cv"),
    )


@router.post("/reentrenar", response_model=ReentrenarOut)
def reentrenar(db: Session = Depends(get_db)):
    """
    Entrena (o re-entrena) el modelo con todo el historial disponible en MySQL.
    Idempotente: sobreescribe el modelo anterior.
    """
    try:
        meta = entrenar(db)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al entrenar: {e}")

    return ReentrenarOut(status="ok", **meta)


@router.get("/manana", response_model=PrediccionDiaOut)
def predecir_manana(db: Session = Depends(get_db)):
    """Predicción de demanda para el día de mañana."""
    manana = date.today() + timedelta(days=1)
    try:
        resultado = predecir_dia(db, manana)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultado


@router.get("/proximos-7-dias", response_model=list[PrediccionDiaOut])
def predecir_proximos_7(db: Session = Depends(get_db)):
    """Predicción de demanda para los próximos 7 días (encadenado)."""
    inicio = date.today() + timedelta(days=1)
    try:
        resultados = predecir_rango(db, inicio, dias=7)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultados


@router.get("/fecha", response_model=PrediccionDiaOut)
def predecir_fecha_especifica(
    fecha: date = Query(..., description="Fecha a predecir (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Predicción de demanda para cualquier fecha futura específica."""
    if fecha <= date.today():
        raise HTTPException(
            status_code=400,
            detail="La fecha debe ser posterior a hoy. Para ver historial usa /ventas.",
        )
    try:
        resultado = predecir_dia(db, fecha)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultado


@router.get("/rango", response_model=list[PrediccionDiaOut])
def predecir_rango_personalizado(
    fecha_inicio: date = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    dias: int = Query(default=7, ge=1, le=30, description="Número de días a predecir (máx 30)"),
    db: Session = Depends(get_db),
):
    """Predicción para un rango personalizado de hasta 30 días."""
    if fecha_inicio <= date.today():
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio debe ser posterior a hoy.",
        )
    try:
        resultados = predecir_rango(db, fecha_inicio, dias=dias)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultados
