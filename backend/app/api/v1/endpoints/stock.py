from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.stock import Stock, MovimientoStock
from app.schemas.stock import MovimientoStockCreate, MovimientoStockOut, StockOut

router = APIRouter(prefix="/stock", tags=["stock"])


class ItemVenta(BaseModel):
    producto_id: int
    cantidad: int


@router.post("/verificar-venta")
def verificar_stock_venta(items: list[ItemVenta], db: Session = Depends(get_db)):
    """
    Verifica si hay stock suficiente para los productos de una venta.
    Devuelve lista de advertencias por ingrediente si hay faltantes.
    """
    if not items:
        return {"puede_proceder": True, "advertencias": []}

    # Necesidad total por ingrediente según recetas
    necesidad: dict[int, dict] = {}
    for item in items:
        recetas = db.execute(
            text("""
                SELECT rd.ingrediente_id, i.nombre, i.unidad_medida,
                       rd.cantidad * :cant AS total_necesario
                FROM recetas_detalle rd
                JOIN ingredientes i ON i.id = rd.ingrediente_id
                WHERE rd.producto_id = :pid AND i.activo = 1
            """),
            {"pid": item.producto_id, "cant": item.cantidad},
        ).fetchall()
        for ing_id, nombre, unidad, necesario in recetas:
            if ing_id not in necesidad:
                necesidad[ing_id] = {"nombre": nombre, "unidad_medida": unidad, "necesario": 0.0}
            necesidad[ing_id]["necesario"] += float(necesario)

    if not necesidad:
        return {"puede_proceder": True, "advertencias": []}

    # Stock disponible
    stock_rows = db.execute(
        text("SELECT ingrediente_id, cantidad_disponible FROM stock WHERE ingrediente_id IN :ids"),
        {"ids": tuple(necesidad.keys())},
    ).fetchall()
    stock_map = {r[0]: float(r[1]) for r in stock_rows}

    advertencias = []
    for ing_id, data in necesidad.items():
        disponible = stock_map.get(ing_id, 0.0)
        faltante = data["necesario"] - disponible
        if faltante > 0:
            advertencias.append({
                "ingrediente":   data["nombre"],
                "unidad_medida": data["unidad_medida"],
                "necesario":     round(data["necesario"], 4),
                "disponible":    round(disponible, 4),
                "faltante":      round(faltante, 4),
            })

    return {"puede_proceder": len(advertencias) == 0, "advertencias": advertencias}


@router.get("/", response_model=list[StockOut])
def listar_stock(db: Session = Depends(get_db)):
    return db.query(Stock).all()


@router.get("/alertas", response_model=list[StockOut])
def stock_bajo_minimo(db: Session = Depends(get_db)):
    """Devuelve ingredientes cuyo stock está por debajo del mínimo configurado."""
    return db.query(Stock).filter(Stock.cantidad_disponible < Stock.cantidad_minima).all()


@router.post("/movimientos", response_model=MovimientoStockOut, status_code=status.HTTP_201_CREATED)
def registrar_movimiento(data: MovimientoStockCreate, db: Session = Depends(get_db)):
    if data.tipo not in ("entrada", "salida"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'entrada' o 'salida'")

    movimiento = MovimientoStock(**data.model_dump())
    db.add(movimiento)

    stock = db.query(Stock).filter(Stock.ingrediente_id == data.ingrediente_id).first()
    if stock:
        if data.tipo == "entrada":
            stock.cantidad_disponible += data.cantidad
        else:
            stock.cantidad_disponible -= data.cantidad
    else:
        cantidad_inicial = data.cantidad if data.tipo == "entrada" else -data.cantidad
        stock = Stock(ingrediente_id=data.ingrediente_id, cantidad_disponible=cantidad_inicial)
        db.add(stock)

    db.commit()
    db.refresh(movimiento)
    return movimiento


@router.get("/movimientos", response_model=list[MovimientoStockOut])
def todos_movimientos(limit: int = 100, db: Session = Depends(get_db)):
    """Todos los movimientos recientes, más nuevos primero."""
    return (
        db.query(MovimientoStock)
        .order_by(MovimientoStock.fecha.desc())
        .limit(limit)
        .all()
    )


@router.get("/movimientos/{ingrediente_id}", response_model=list[MovimientoStockOut])
def historial_movimientos(ingrediente_id: int, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(MovimientoStock)
        .filter(MovimientoStock.ingrediente_id == ingrediente_id)
        .order_by(MovimientoStock.fecha.desc())
        .limit(limit)
        .all()
    )
