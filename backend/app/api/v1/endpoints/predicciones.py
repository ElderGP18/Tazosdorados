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
    - Recetas (cantidad de ingrediente por producto) — rebaja TODOS los ingredientes
    - Stock actual disponible, descontando stock que vencerá antes de usarse (FIFO)

    Devuelve totales resumidos (Q total, cantidad de items) para que sea claro
    cuánto gastar y qué ingredientes deben ir en la lista de compras.
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

    # Cargar recetas — incluye TODOS los ingredientes activos (tortilla, carne, salsas, etc.)
    recetas_sql = text("""
        SELECT rd.producto_id, rd.ingrediente_id, rd.cantidad,
               i.nombre, i.unidad_medida, i.costo_unitario
        FROM recetas_detalle rd
        JOIN ingredientes i ON i.id = rd.ingrediente_id
        WHERE i.activo = 1
    """)
    recetas = db.execute(recetas_sql).fetchall()

    # Calcular necesidad total por ingrediente (TODOS los ingredientes de todas las recetas)
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

    # Calcular stock en riesgo de merma (FIFO): cantidad que vencerá dentro del período proyectado
    entradas_rows = db.execute(
        text("""
            SELECT ingrediente_id, fecha, cantidad
            FROM movimientos_stock
            WHERE tipo = 'entrada'
            ORDER BY ingrediente_id, fecha ASC
        """)
    ).fetchall()
    from collections import defaultdict
    entradas_por_ing: dict = defaultdict(list)
    for ing_id, fecha, cantidad in entradas_rows:
        entradas_por_ing[ing_id].append({"fecha": fecha, "cantidad": float(cantidad)})

    ahora = datetime.now(timezone.utc)

    def _stock_efectivo(ing_id: int, stock_actual: float) -> tuple[float, float]:
        """Devuelve (stock_utilizable, stock_en_merma) considerando FIFO.
        Las salidas (ventas) consumen el lote más antiguo primero → merma se reduce primero."""
        vida = _vida_util(necesidad.get(ing_id, {}).get("nombre", ""))
        if vida >= 60:
            return stock_actual, 0.0
        entradas = entradas_por_ing.get(ing_id, [])
        if not entradas:
            return stock_actual, 0.0

        total_entrado = sum(e["cantidad"] for e in entradas)
        ya_consumido = max(0.0, total_entrado - stock_actual)

        en_merma = 0.0
        for e in sorted(entradas, key=lambda x: x["fecha"]):
            if ya_consumido >= e["cantidad"]:
                ya_consumido -= e["cantidad"]
                continue
            restante = e["cantidad"] - ya_consumido
            ya_consumido = 0.0
            fecha_entrada = _to_aware(e["fecha"])
            dias_en_stock = (ahora - fecha_entrada).days
            dias_restantes = vida - dias_en_stock
            # Si este lote vence antes de que termine el período proyectado, es merma
            if dias_restantes < dias:
                en_merma += restante

        utilizable = max(0.0, stock_actual - en_merma)
        return utilizable, en_merma

    # Calcular recomendación de compra
    resultado = []
    total_costo_compra = 0.0
    total_costo_merma = 0.0
    items_a_comprar = 0
    items_alta = 0
    items_media = 0

    for ing_id, data in necesidad.items():
        stock_info = stock_map.get(ing_id, {"disponible": 0.0, "minima": 0.0})
        disponible_raw = stock_info["disponible"]
        minimo = stock_info["minima"]
        necesario = data["cantidad_necesaria"]

        # Descontar stock que vencerá antes de usarse (merma FIFO)
        disponible_efectivo, merma_estimada = _stock_efectivo(ing_id, disponible_raw)

        # Comprar lo que falta + stock mínimo de seguridad
        a_comprar = max(0.0, necesario - disponible_efectivo + minimo)
        costo_estimado = round(a_comprar * data["costo_unitario"], 2)
        costo_merma = round(merma_estimada * data["costo_unitario"], 2)

        prioridad = "alta" if a_comprar > 0 and disponible_efectivo < minimo else \
                    "media" if a_comprar > 0 else "ok"

        if a_comprar > 0:
            items_a_comprar += 1
            total_costo_compra += costo_estimado
        total_costo_merma += costo_merma
        if prioridad == "alta": items_alta += 1
        if prioridad == "media": items_media += 1

        resultado.append({
            "ingrediente_id":     ing_id,
            "nombre":             data["nombre"],
            "unidad_medida":      data["unidad_medida"],
            "costo_unitario":     round(data["costo_unitario"], 4),
            "stock_actual":       round(disponible_raw, 4),
            "stock_utilizable":   round(disponible_efectivo, 4),
            "merma_estimada":     round(merma_estimada, 4),
            "costo_merma":        costo_merma,
            "cantidad_necesaria": round(necesario, 4),
            "cantidad_a_comprar": round(a_comprar, 4),
            "costo_estimado":     costo_estimado,
            "stock_minimo":       round(minimo, 4),
            "prioridad":          prioridad,
        })

    resultado.sort(key=lambda x: (x["prioridad"] != "alta", x["prioridad"] != "media", -x["costo_estimado"]))

    return {
        "dias_proyectados": dias,
        "resumen": {
            "items_a_comprar":     items_a_comprar,
            "items_alta":          items_alta,
            "items_media":         items_media,
            "total_costo_compra":  round(total_costo_compra, 2),
            "total_costo_merma":   round(total_costo_merma, 2),
        },
        "recomendaciones": resultado,
    }


def _to_aware(dt) -> datetime:
    """Convierte datetime naive o date a datetime UTC-aware."""
    if isinstance(dt, datetime):
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


@router.get("/riesgo-merma")
def riesgo_merma(db: Session = Depends(get_db)):
    """
    Calcula el riesgo de merma por LOTE (FIFO).
    Los lotes más antiguos se consumen primero. Cuando hay una salida (venta,
    descarte) se rebaja del lote más viejo → la merma se reduce ANTES que el
    stock fresco.

    Devuelve totales globales (unidades y Q) para que sea claro cuánto se tiene
    de merma.
    """
    # Costo por ingrediente (para calcular Q de merma)
    costos_rows = db.execute(text("SELECT id, costo_unitario FROM ingredientes")).fetchall()
    costo_map = {r[0]: float(r[1]) for r in costos_rows}

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

    # Totales globales (para el header de la página de merma)
    totales = {
        "ingredientes_con_merma":    0,  # cuántos ingredientes tienen al menos una unidad vencida/pronto-a-vencer
        "ingredientes_vencidos":     0,  # cuántos tienen lote vencido
        "cantidad_merma":            0.0,  # suma total de unidades vencidas + al borde (alto)
        "cantidad_vencida":          0.0,  # solo unidades vencidas
        "cantidad_pronta_vencer":    0.0,  # solo unidades estado "alto"
        "costo_merma":               0.0,  # Q total de merma = (vencida + alto) × costo_unitario
        "costo_vencida":             0.0,
        "costo_pronta_vencer":       0.0,
    }

    for ing_id, nombre, unidad, disponible in rows:
        vida_util = _vida_util(nombre)
        if vida_util >= 60:
            continue  # No perecedero

        stock_actual = float(disponible)
        entradas = entradas_por_ing.get(ing_id, [])

        # ── Calcular lotes en stock usando FIFO ──────────────────────
        if not entradas:
            lotes_en_stock = [{"ref_aware": ahora, "cantidad": stock_actual}]
        else:
            total_entrado = sum(e["cantidad"] for e in entradas)
            ya_consumido = max(0.0, total_entrado - stock_actual)

            lotes_en_stock = []
            for e in entradas:  # más antiguo primero
                if ya_consumido <= 0:
                    lotes_en_stock.append({"ref_aware": _to_aware(e["fecha"]), "cantidad": e["cantidad"]})
                elif ya_consumido >= e["cantidad"]:
                    ya_consumido -= e["cantidad"]
                else:
                    restante = e["cantidad"] - ya_consumido
                    ya_consumido = 0.0
                    lotes_en_stock.append({"ref_aware": _to_aware(e["fecha"]), "cantidad": restante})

        # ── Evaluar frescura de cada lote ────────────────────────────
        lotes_info = []
        estado_general = "ok"
        qty_vencida  = 0.0
        qty_alto     = 0.0  # a punto de vencer
        qty_medio    = 0.0
        qty_fresco   = 0.0

        for lote in lotes_en_stock:
            dias_en_stock = max(0, (ahora - lote["ref_aware"]).days)
            dias_restantes = vida_util - dias_en_stock
            pct = max(0, round((dias_restantes / vida_util) * 100))

            if dias_restantes <= 0:
                estado_lote = "vencido"
                qty_vencida += lote["cantidad"]
            elif pct <= 25:
                estado_lote = "alto"
                qty_alto += lote["cantidad"]
            elif pct <= 60:
                estado_lote = "medio"
                qty_medio += lote["cantidad"]
            else:
                estado_lote = "ok"
                qty_fresco += lote["cantidad"]

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

        costo_unit = costo_map.get(ing_id, 0.0)
        cantidad_merma_ing = qty_vencida + qty_alto  # vencida + a punto de vencer
        costo_merma_ing    = cantidad_merma_ing * costo_unit

        # Totales globales
        if cantidad_merma_ing > 0:
            totales["ingredientes_con_merma"] += 1
        if qty_vencida > 0:
            totales["ingredientes_vencidos"] += 1
        totales["cantidad_merma"]         += cantidad_merma_ing
        totales["cantidad_vencida"]       += qty_vencida
        totales["cantidad_pronta_vencer"] += qty_alto
        totales["costo_merma"]            += costo_merma_ing
        totales["costo_vencida"]          += qty_vencida * costo_unit
        totales["costo_pronta_vencer"]    += qty_alto * costo_unit

        resultado.append({
            "ingrediente_id":   ing_id,
            "nombre":           nombre,
            "unidad_medida":    unidad,
            "stock_actual":     round(stock_actual, 4),
            "stock_bueno":      round(qty_fresco + qty_medio, 4),      # stock utilizable (fresco + vigilar)
            "stock_merma":      round(cantidad_merma_ing, 4),            # vencida + al borde
            "cantidad_vencida": round(qty_vencida, 4),
            "cantidad_pronta_vencer": round(qty_alto, 4),
            "costo_unitario":   round(costo_unit, 4),
            "costo_merma":      round(costo_merma_ing, 2),
            "vida_util_dias":   vida_util,
            "estado_general":   estado_general,
            "lotes":            lotes_info,
        })

    resultado.sort(key=lambda x: (orden_estado.get(x["estado_general"], 4), -x["costo_merma"], x["nombre"]))

    # Redondeo final de totales
    totales["cantidad_merma"]         = round(totales["cantidad_merma"], 4)
    totales["cantidad_vencida"]       = round(totales["cantidad_vencida"], 4)
    totales["cantidad_pronta_vencer"] = round(totales["cantidad_pronta_vencer"], 4)
    totales["costo_merma"]            = round(totales["costo_merma"], 2)
    totales["costo_vencida"]          = round(totales["costo_vencida"], 2)
    totales["costo_pronta_vencer"]    = round(totales["costo_pronta_vencer"], 2)

    return {"totales": totales, "ingredientes": resultado}
