from datetime import date, datetime, timedelta, timezone

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


def _to_aware(dt) -> datetime:
    """Convierte datetime naive o date a datetime UTC-aware."""
    if isinstance(dt, datetime):
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


@router.get("/riesgo-merma")
def riesgo_merma(db: Session = Depends(get_db)):
    """
    Calcula el riesgo de merma por LOTE (FIFO).
    Los lotes más antiguos se consumen primero. Si hay stock de distintas
    fechas de compra, se muestra el estado real de cada lote.
    """
    # Todas las entradas de stock, ordenadas de más antiguo a más nuevo
    entradas_rows = db.execute(
        text("""
            SELECT ingrediente_id, fecha, cantidad
            FROM movimientos_stock
            WHERE tipo = 'entrada'
            ORDER BY ingrediente_id, fecha ASC
        """)
    ).fetchall()

    # Agrupar entradas por ingrediente
    from collections import defaultdict
    entradas_por_ing: dict = defaultdict(list)
    for ing_id, fecha, cantidad in entradas_rows:
        entradas_por_ing[ing_id].append({"fecha": fecha, "cantidad": float(cantidad)})

    # Todos los ingredientes activos con su stock actual
    rows = db.execute(
        text("""
            SELECT s.ingrediente_id, i.nombre, i.unidad_medida, s.cantidad_disponible
            FROM stock s
            JOIN ingredientes i ON i.id = s.ingrediente_id
            WHERE i.activo = 1
        """)
    ).fetchall()

    ahora = datetime.now(timezone.utc)
    orden_estado = {"vencido": 0, "alto": 1, "medio": 2, "ok": 3}
    resultado = []

    for ing_id, nombre, unidad, disponible in rows:
        vida_util = _vida_util(nombre)
        if vida_util >= 60:
            continue  # No perecedero

        stock_actual = float(disponible)
        entradas = entradas_por_ing.get(ing_id, [])

        # ── Calcular lotes en stock usando FIFO ──────────────────────
        if not entradas:
            # Sin historial de entradas: asumir todo es de hoy
            lotes_en_stock = [{"ref_aware": ahora, "cantidad": stock_actual}]
        else:
            total_entrado = sum(e["cantidad"] for e in entradas)
            ya_consumido = max(0.0, total_entrado - stock_actual)

            lotes_en_stock = []
            for e in entradas:  # más antiguo primero
                if ya_consumido <= 0:
                    lotes_en_stock.append({"ref_aware": _to_aware(e["fecha"]), "cantidad": e["cantidad"]})
                elif ya_consumido >= e["cantidad"]:
                    ya_consumido -= e["cantidad"]  # lote completamente consumido
                else:
                    # Lote parcialmente consumido — solo queda el resto
                    restante = e["cantidad"] - ya_consumido
                    ya_consumido = 0.0
                    lotes_en_stock.append({"ref_aware": _to_aware(e["fecha"]), "cantidad": restante})

        # ── Evaluar frescura de cada lote ────────────────────────────
        lotes_info = []
        estado_general = "ok"

        for lote in lotes_en_stock:
            dias_en_stock = max(0, (ahora - lote["ref_aware"]).days)
            dias_restantes = vida_util - dias_en_stock
            pct = max(0, round((dias_restantes / vida_util) * 100))

            if dias_restantes <= 0:
                estado_lote = "vencido"
            elif pct <= 25:
                estado_lote = "alto"
            elif pct <= 60:
                estado_lote = "medio"
            else:
                estado_lote = "ok"

            if orden_estado[estado_lote] < orden_estado[estado_general]:
                estado_general = estado_lote

            lotes_info.append({
                "cantidad":          round(lote["cantidad"], 4),
                "fecha_ingreso":     lote["ref_aware"].date().isoformat(),
                "dias_en_stock":     dias_en_stock,
                "dias_restantes":    max(0, dias_restantes),
                "porcentaje_restante": pct,
                "estado":            estado_lote,
            })

        resultado.append({
            "ingrediente_id": ing_id,
            "nombre":         nombre,
            "unidad_medida":  unidad,
            "stock_actual":   round(stock_actual, 4),
            "vida_util_dias": vida_util,
            "estado_general": estado_general,
            "lotes":          lotes_info,
        })

    resultado.sort(key=lambda x: (orden_estado.get(x["estado_general"], 4), x["nombre"]))
    return {"ingredientes": resultado}
