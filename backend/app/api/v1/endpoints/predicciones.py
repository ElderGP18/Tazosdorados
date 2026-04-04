from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
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

# Ingredientes perecederos y su vida útil estimada en días
_VIDA_UTIL = {
    "carne":   3,
    "pollo":   3,
    "marrano": 3,
    "chorizo": 5,
    "queso":   5,
    "crema":   5,
    "tomate":  5,
    "cilantro": 4,
    "aguacate": 4,
    "piña":    5,
    "limón":   7,
    "cebolla": 14,
    "frijol":  30,
    "sal":     365,
    "aceite":  365,
    "tortilla": 2,
}

def _vida_util(nombre: str) -> int:
    nombre_lower = nombre.lower()
    for clave, dias in _VIDA_UTIL.items():
        if clave in nombre_lower:
            return dias
    return 7  # default para ingredientes no clasificados


@router.get("/estado", response_model=EstadoModeloOut)
def estado_modelo():
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
    try:
        meta = entrenar(db)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al entrenar: {e}")
    return ReentrenarOut(status="ok", **meta)


@router.get("/manana", response_model=PrediccionDiaOut)
def predecir_manana(db: Session = Depends(get_db)):
    manana = date.today() + timedelta(days=1)
    try:
        resultado = predecir_dia(db, manana)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultado


@router.get("/proximos-7-dias", response_model=list[PrediccionDiaOut])
def predecir_proximos_7(db: Session = Depends(get_db)):
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
    if fecha <= date.today():
        raise HTTPException(status_code=400, detail="La fecha debe ser posterior a hoy.")
    try:
        resultado = predecir_dia(db, fecha)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultado


@router.get("/rango", response_model=list[PrediccionDiaOut])
def predecir_rango_personalizado(
    fecha_inicio: date = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    dias: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    if fecha_inicio <= date.today():
        raise HTTPException(status_code=400, detail="La fecha de inicio debe ser posterior a hoy.")
    try:
        resultados = predecir_rango(db, fecha_inicio, dias=dias)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return resultados


@router.get("/recomendaciones-compra")
def recomendaciones_compra(
    dias: int = Query(default=7, ge=1, le=30, description="Días a proyectar"),
    db: Session = Depends(get_db),
):
    """
    Recomienda cuánto comprar de cada ingrediente basado en:
    - Predicción ML de ventas para los próximos N días
    - Recetas (cantidad de ingrediente por producto)
    - Stock actual disponible
    """
    if not modelo_disponible():
        raise HTTPException(
            status_code=409,
            detail="Modelo no entrenado. Usa POST /predicciones/reentrenar primero.",
        )

    inicio = date.today() + timedelta(days=1)
    predicciones = predecir_rango(db, inicio, dias=dias)

    # Construir mapa producto_id -> unidades_predichas totales
    unidades_por_producto: dict[int, float] = {}
    for dia in predicciones:
        for prod in dia["productos"]:
            pid = prod["producto_id"]
            unidades_por_producto[pid] = (
                unidades_por_producto.get(pid, 0.0) + prod["unidades_predichas"]
            )

    # Cargar recetas
    recetas_sql = text("""
        SELECT rd.producto_id, rd.ingrediente_id, rd.cantidad,
               i.nombre, i.unidad_medida, i.costo_unitario
        FROM recetas_detalle rd
        JOIN ingredientes i ON i.id = rd.ingrediente_id
        WHERE i.activo = 1
    """)
    recetas = db.execute(recetas_sql).fetchall()

    # Calcular necesidad total por ingrediente
    necesidad: dict[int, dict] = {}
    for r in recetas:
        prod_id, ing_id, cant_receta, nombre, unidad, costo = r
        unidades = unidades_por_producto.get(prod_id, 0.0)
        cantidad_necesaria = float(cant_receta) * unidades
        if ing_id not in necesidad:
            necesidad[ing_id] = {
                "ingrediente_id": ing_id,
                "nombre": nombre,
                "unidad_medida": unidad,
                "costo_unitario": float(costo),
                "cantidad_necesaria": 0.0,
            }
        necesidad[ing_id]["cantidad_necesaria"] += cantidad_necesaria

    # Cargar stock actual
    stock_sql = text("""
        SELECT ingrediente_id, cantidad_disponible, cantidad_minima
        FROM stock
    """)
    stock_rows = db.execute(stock_sql).fetchall()
    stock_map = {r[0]: {"disponible": float(r[1]), "minima": float(r[2])} for r in stock_rows}

    # Calcular recomendación de compra
    resultado = []
    for ing_id, data in necesidad.items():
        stock_info = stock_map.get(ing_id, {"disponible": 0.0, "minima": 0.0})
        disponible = stock_info["disponible"]
        minimo = stock_info["minima"]
        necesario = data["cantidad_necesaria"]
        # Comprar lo que falta + stock mínimo de seguridad
        a_comprar = max(0.0, necesario - disponible + minimo)
        costo_estimado = round(a_comprar * data["costo_unitario"], 2)

        resultado.append({
            "ingrediente_id":    ing_id,
            "nombre":            data["nombre"],
            "unidad_medida":     data["unidad_medida"],
            "stock_actual":      round(disponible, 4),
            "cantidad_necesaria": round(necesario, 4),
            "cantidad_a_comprar": round(a_comprar, 4),
            "costo_estimado":    costo_estimado,
            "prioridad":         "alta" if a_comprar > 0 and disponible < minimo else
                                 "media" if a_comprar > 0 else "ok",
        })

    resultado.sort(key=lambda x: (x["prioridad"] != "alta", x["prioridad"] != "media"))
    return {"dias_proyectados": dias, "recomendaciones": resultado}


@router.get("/riesgo-merma")
def riesgo_merma(db: Session = Depends(get_db)):
    """
    Evalúa el riesgo de merma de ingredientes perecederos basado en:
    - Stock actual
    - Consumo promedio diario (últimos 14 días de ventas)
    - Vida útil estimada del ingrediente
    """
    # Consumo promedio diario por ingrediente (últimos 14 días)
    consumo_sql = text("""
        SELECT
            rd.ingrediente_id,
            SUM(dv.cantidad * rd.cantidad) / 14.0 AS consumo_diario_promedio
        FROM detalles_venta dv
        JOIN ventas v ON v.id = dv.venta_id
        JOIN recetas_detalle rd ON rd.producto_id = dv.producto_id
        WHERE v.fecha >= DATE_SUB(NOW(), INTERVAL 14 DAY)
        GROUP BY rd.ingrediente_id
    """)
    consumo_rows = db.execute(consumo_sql).fetchall()
    consumo_map = {r[0]: float(r[1]) for r in consumo_rows}

    # Stock + info de ingrediente
    stock_sql = text("""
        SELECT s.ingrediente_id, i.nombre, i.unidad_medida,
               s.cantidad_disponible, s.cantidad_minima
        FROM stock s
        JOIN ingredientes i ON i.id = s.ingrediente_id
        WHERE i.activo = 1
          AND i.unidad_medida IN ('kg', 'litro', 'unidad')
    """)
    stock_rows = db.execute(stock_sql).fetchall()

    resultado = []
    for ing_id, nombre, unidad, disponible, minimo in stock_rows:
        disponible = float(disponible)
        consumo_dia = consumo_map.get(ing_id, 0.0)
        vida_util = _vida_util(nombre)

        # Días hasta agotar stock
        dias_restantes = (
            round(disponible / consumo_dia, 1) if consumo_dia > 0 else 999
        )

        # Cantidad que podría vencer antes de consumirse
        consumo_en_vida_util = consumo_dia * vida_util
        exceso = max(0.0, disponible - consumo_en_vida_util)

        # Clasificación de riesgo
        if exceso > 0 and vida_util <= 5:
            riesgo = "alto"
        elif exceso > 0 and vida_util <= 10:
            riesgo = "medio"
        elif disponible < float(minimo):
            riesgo = "bajo_stock"
        else:
            riesgo = "normal"

        if riesgo != "normal":
            resultado.append({
                "ingrediente_id":       ing_id,
                "nombre":               nombre,
                "unidad_medida":        unidad,
                "stock_actual":         round(disponible, 4),
                "consumo_diario_prom":  round(consumo_dia, 4),
                "vida_util_dias":       vida_util,
                "dias_hasta_agotar":    dias_restantes,
                "exceso_estimado":      round(exceso, 4),
                "riesgo":               riesgo,
            })

    resultado.sort(key=lambda x: {"alto": 0, "medio": 1, "bajo_stock": 2}.get(x["riesgo"], 3))
    return {"ingredientes_en_riesgo": resultado}
