from datetime import date, datetime, timedelta
from decimal import Decimal

# Guatemala siempre UTC-6 (sin horario de verano)
_GT_OFFSET = timedelta(hours=6)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.venta import Venta, DetalleVenta
from app.models.receta import RecetaDetalle
from app.models.stock import Stock, MovimientoStock
from app.schemas.venta import VentaCreate, VentaOut

router = APIRouter(prefix="/ventas", tags=["ventas"])


@router.get("/", response_model=list[VentaOut])
def listar_ventas(
    fecha_desde: date | None = Query(None),
    fecha_hasta: date | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Venta)
    if fecha_desde:
        # Convertir fecha Guatemala a UTC: inicio del día GT = inicio_dia + 6h en UTC
        dt_desde = datetime.combine(fecha_desde, datetime.min.time()) + _GT_OFFSET
        query = query.filter(Venta.fecha >= dt_desde)
    if fecha_hasta:
        # Final del día Guatemala en UTC = fin_dia_GT + 6h = inicio día siguiente + 6h en UTC
        dt_hasta = datetime.combine(fecha_hasta, datetime.min.time()) + _GT_OFFSET + timedelta(days=1)
        query = query.filter(Venta.fecha < dt_hasta)
    return query.order_by(Venta.fecha.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(data: VentaCreate, db: Session = Depends(get_db)):
    """
    Registra una venta y rebaja TODOS los ingredientes de todas las recetas
    (tortilla, carne, cebolla, salsas, guacamol, etc.).

    El descuento consume el lote más antiguo primero (FIFO) — así la merma
    se rebaja ANTES que el stock fresco. El modelo de lotes se calcula
    dinámicamente en /predicciones/riesgo-merma; aquí solo registramos el
    movimiento con su fecha para que el FIFO sea reproducible.
    """
    if not data.detalles:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

    # 1) Agrupar necesidad total por ingrediente (combina todos los productos
    #    de la venta: así si dos items comparten "cebolla" se suma todo).
    producto_ids = {d.producto_id for d in data.detalles}
    recetas_rows = (
        db.query(RecetaDetalle)
        .filter(RecetaDetalle.producto_id.in_(producto_ids))
        .all()
    )
    recetas_by_prod: dict[int, list[RecetaDetalle]] = {}
    for r in recetas_rows:
        recetas_by_prod.setdefault(r.producto_id, []).append(r)

    # (Si hubiera productos sin receta se dejan pasar; solo se rebajan los que sí la tienen)

    # 2) Calcular total y crear detalles
    total = Decimal("0")
    detalles_orm = []
    for det in data.detalles:
        subtotal = Decimal(str(det.cantidad)) * det.precio_unitario
        total += subtotal
        detalles_orm.append(
            DetalleVenta(
                producto_id=det.producto_id,
                cantidad=det.cantidad,
                precio_unitario=det.precio_unitario,
                subtotal=subtotal,
            )
        )

    venta = Venta(
        metodo_pago=data.metodo_pago,
        notas=data.notas,
        total=total,
        detalles=detalles_orm,
    )
    db.add(venta)
    db.flush()  # Obtener venta.id sin hacer commit todavía

    # 3) Agregación: ingrediente_id -> cantidad total a rebajar
    necesidad_total: dict[int, Decimal] = {}
    for det in data.detalles:
        for receta in recetas_by_prod.get(det.producto_id, []):
            uso = receta.cantidad * Decimal(str(det.cantidad))
            necesidad_total[receta.ingrediente_id] = necesidad_total.get(receta.ingrediente_id, Decimal("0")) + uso

    # 4) Rebajar stock y registrar UN SOLO movimiento por ingrediente
    #    (FIFO implícito: el cálculo de lotes en riesgo-merma consume primero
    #    las entradas más antiguas basándose en total_entrado - stock_actual).
    for ing_id, cantidad_usar in necesidad_total.items():
        stock = db.query(Stock).filter(Stock.ingrediente_id == ing_id).first()
        if stock:
            stock.cantidad_disponible = max(
                Decimal("0"),
                stock.cantidad_disponible - cantidad_usar,
            )
        db.add(MovimientoStock(
            ingrediente_id=ing_id,
            tipo="salida",
            cantidad=cantidad_usar,
            referencia=f"venta_{venta.id}",
            notas="Descuento automático por venta (FIFO)",
        ))

    db.commit()
    db.refresh(venta)
    return venta


@router.get("/{venta_id}", response_model=VentaOut)
def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta
