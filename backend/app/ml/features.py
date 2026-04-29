"""
Ingeniería de features para el modelo de predicción de demanda.
Incluye features temporales, estacionales y de feriados guatemaltecos.
"""
from __future__ import annotations

import pandas as pd
import numpy as np


FEATURE_COLS = [
    # Día de la semana: codificación cíclica (sin/cos) + flags binarios Vie/Sáb/Dom
    "sin_dow",
    "cos_dow",
    "is_friday",
    "is_saturday",
    "is_sunday",
    # Otras temporales
    "day_of_month",
    "month",
    "quarter",
    "is_weekend",
    "is_holiday",
    "is_rainy_season",   # Guatemala: mayo–octubre
    # Lags y rolling
    "lag_1",
    "lag_7",
    "rolling_7d_mean",
    "rolling_14d_mean",
]


def _is_rainy_season(month: int) -> int:
    """Época lluviosa en Guatemala: mayo (5) – octubre (10)."""
    return int(5 <= month <= 10)


def build_features(df: pd.DataFrame, holidays: set[str]) -> pd.DataFrame:
    """
    Recibe un DataFrame con columnas [date, units_sold] y devuelve
    uno con todas las features listas para entrenar.
    """
    df = df.copy().sort_values("date").reset_index(drop=True)

    dow = df["date"].dt.dayofweek
    # Codificación cíclica: preserva la naturaleza circular del día de semana
    # (Domingo=6 y Lunes=0 son días adyacentes, no extremos opuestos)
    df["sin_dow"]     = np.sin(2 * np.pi * dow / 7)
    df["cos_dow"]     = np.cos(2 * np.pi * dow / 7)
    df["is_friday"]   = (dow == 4).astype(int)
    df["is_saturday"] = (dow == 5).astype(int)
    df["is_sunday"]   = (dow == 6).astype(int)

    df["day_of_month"]    = df["date"].dt.day
    df["month"]           = df["date"].dt.month
    df["quarter"]         = df["date"].dt.quarter
    df["is_weekend"]      = (dow >= 5).astype(int)
    df["is_holiday"]      = df["date"].dt.strftime("%Y-%m-%d").isin(holidays).astype(int)
    df["is_rainy_season"] = df["month"].apply(_is_rainy_season)

    df["lag_1"]            = df["units_sold"].shift(1)
    df["lag_7"]            = df["units_sold"].shift(7)
    df["rolling_7d_mean"]  = df["units_sold"].shift(1).rolling(7).mean()
    df["rolling_14d_mean"] = df["units_sold"].shift(1).rolling(14).mean()

    df = df.dropna(subset=FEATURE_COLS).reset_index(drop=True)
    return df


def build_future_row(
    target_date: pd.Timestamp,
    history: pd.DataFrame,
    holidays: set[str],
) -> pd.DataFrame:
    """
    Construye un vector de features para una fecha futura sin target conocido.
    """
    history = history.sort_values("date").reset_index(drop=True)
    series  = history["units_sold"]

    lag_1  = float(series.iloc[-1])  if len(series) >= 1  else 0.0
    lag_7  = float(series.iloc[-7])  if len(series) >= 7  else lag_1
    roll7  = float(series.iloc[-7:].mean())  if len(series) >= 7  else lag_1
    roll14 = float(series.iloc[-14:].mean()) if len(series) >= 14 else roll7

    dow = target_date.dayofweek
    row = {
        "date":            target_date,
        "sin_dow":         np.sin(2 * np.pi * dow / 7),
        "cos_dow":         np.cos(2 * np.pi * dow / 7),
        "is_friday":       int(dow == 4),
        "is_saturday":     int(dow == 5),
        "is_sunday":       int(dow == 6),
        "day_of_month":    target_date.day,
        "month":           target_date.month,
        "quarter":         target_date.quarter,
        "is_weekend":      int(dow >= 5),
        "is_holiday":      int(target_date.strftime("%Y-%m-%d") in holidays),
        "is_rainy_season": _is_rainy_season(target_date.month),
        "lag_1":           lag_1,
        "lag_7":           lag_7,
        "rolling_7d_mean":  roll7,
        "rolling_14d_mean": roll14,
    }
    return pd.DataFrame([row])
