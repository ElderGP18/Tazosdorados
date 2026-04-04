from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.venta import Venta, DetalleVenta
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
        query = query.filter(Venta.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.filter(Venta.fecha <= fecha_hasta)
    return query.order_by(Venta.fecha.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=VentaOut, status_code=status.HTTP_201_CREATED)
def registrar_venta(data: VentaCreate, db: Session = Depends(get_db)):
    if not data.detalles:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un producto")

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
    db.commit()
    db.refresh(venta)
    return venta


@router.get("/{venta_id}", response_model=VentaOut)
def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta
