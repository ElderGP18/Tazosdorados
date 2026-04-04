from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.stock import Stock, MovimientoStock
from app.schemas.stock import MovimientoStockCreate, MovimientoStockOut, StockOut

router = APIRouter(prefix="/stock", tags=["stock"])


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
