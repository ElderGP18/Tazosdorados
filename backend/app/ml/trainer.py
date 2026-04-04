"""
Entrena el modelo de predicción de demanda y lo persiste en disco.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import TimeSeriesSplit
from sqlalchemy.orm import Session

from app.ml.features import FEATURE_COLS, build_features
from app.ml.loader import cargar_ventas_diarias, cargar_feriados

MODEL_DIR = Path(__file__).parent / "saved_models"
MODEL_PATH = MODEL_DIR / "demand_model.joblib"
META_PATH  = MODEL_DIR / "model_meta.json"

MIN_DIAS_ENTRENAMIENTO = 14


def entrenar(db: Session) -> dict:
    """
    Carga historial, construye features, entrena y persiste el modelo.
    Devuelve métricas del entrenamiento.
    """
    df_raw   = cargar_ventas_diarias(db)
    holidays = cargar_feriados(db)

    if len(df_raw) < MIN_DIAS_ENTRENAMIENTO:
        raise ValueError(
            f"Se necesitan al menos {MIN_DIAS_ENTRENAMIENTO} días de historial "
            f"para entrenar. Actualmente hay {len(df_raw)} días."
        )

    df = build_features(df_raw, holidays)

    X = df[FEATURE_COLS].values
    y = df["units_sold"].values

    # Validación con time-series split (no shuffle)
    tscv = TimeSeriesSplit(n_splits=min(3, len(df) // 5))
    maes = []
    for train_idx, val_idx in tscv.split(X):
        model_cv = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )
        model_cv.fit(X[train_idx], y[train_idx])
        preds = model_cv.predict(X[val_idx])
        maes.append(mean_absolute_error(y[val_idx], preds))

    mae_cv = float(np.mean(maes))
    rmse_cv = float(np.sqrt(np.mean(np.array(maes) ** 2)))

    # Entrenamiento final con todos los datos
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    meta = {
        "entrenado_en":   datetime.now(timezone.utc).isoformat(),
        "dias_historicos": int(len(df_raw)),
        "dias_con_features": int(len(df)),
        "mae_cv":  round(mae_cv, 2),
        "rmse_cv": round(rmse_cv, 2),
        "feature_cols": FEATURE_COLS,
    }
    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    return meta


def modelo_disponible() -> bool:
    return MODEL_PATH.exists() and META_PATH.exists()


def cargar_meta() -> dict:
    if not META_PATH.exists():
        return {}
    return json.loads(META_PATH.read_text())


def cargar_modelo():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Modelo no entrenado. Llama a POST /api/v1/predicciones/reentrenar primero."
        )
    return joblib.load(MODEL_PATH)
