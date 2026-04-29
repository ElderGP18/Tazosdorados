"""
Añade Refresco y Agua Fresca como ingredientes rastreables en stock,
y crea las recetas que los vinculan con los productos de venta.
Ejecución: python -m scripts.add_bebidas_stock  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal


def run():
    db: Session = SessionLocal()
    print("=== Agregando bebidas a control de stock ===")
    try:
        bebidas = [
            {
                "producto_nombre": "Refresco",
                "ing_nombre":      "Refresco",
                "ing_unidad":      "unidad",
                "ing_costo":       6.0,
                "stock_inicial":   0.0,
                "stock_minimo":    12.0,
            },
            {
                "producto_nombre": "Agua Fresca",
                "ing_nombre":      "Agua Fresca",
                "ing_unidad":      "unidad",
                "ing_costo":       5.0,
                "stock_inicial":   0.0,
                "stock_minimo":    12.0,
            },
        ]

        for b in bebidas:
            # 1. Verificar / crear ingrediente
            row = db.execute(
                text("SELECT id FROM ingredientes WHERE nombre = :n"),
                {"n": b["ing_nombre"]},
            ).fetchone()

            if row:
                ing_id = row[0]
                print(f"  ~ Ingrediente '{b['ing_nombre']}' ya existe (id={ing_id})")
            else:
                db.execute(
                    text("""
                        INSERT INTO ingredientes
                            (nombre, unidad_medida, costo_unitario, activo, created_at, updated_at)
                        VALUES (:n, :u, :c, 1, NOW(), NOW())
                    """),
                    {"n": b["ing_nombre"], "u": b["ing_unidad"], "c": b["ing_costo"]},
                )
                db.flush()
                ing_id = db.execute(
                    text("SELECT id FROM ingredientes WHERE nombre = :n"),
                    {"n": b["ing_nombre"]},
                ).fetchone()[0]
                print(f"  + Ingrediente '{b['ing_nombre']}' creado (id={ing_id})")

            # 2. Verificar / crear registro en stock
            stock_row = db.execute(
                text("SELECT id FROM stock WHERE ingrediente_id = :id"),
                {"id": ing_id},
            ).fetchone()

            if stock_row:
                print(f"  ~ Stock para '{b['ing_nombre']}' ya existe")
            else:
                db.execute(
                    text("""
                        INSERT INTO stock
                            (ingrediente_id, cantidad_disponible, cantidad_minima, ultima_actualizacion)
                        VALUES (:id, :disp, :min, NOW())
                    """),
                    {"id": ing_id, "disp": b["stock_inicial"], "min": b["stock_minimo"]},
                )
                print(f"  + Stock creado para '{b['ing_nombre']}' (minimo={b['stock_minimo']})")

            # 3. Buscar producto de venta
            prod_row = db.execute(
                text("SELECT id FROM productos WHERE nombre = :n AND activo = 1"),
                {"n": b["producto_nombre"]},
            ).fetchone()

            if not prod_row:
                print(f"  ! Producto '{b['producto_nombre']}' no encontrado, omitiendo receta")
                continue

            prod_id = prod_row[0]

            # 4. Verificar / crear receta-detalle (1 unidad de ingrediente por venta)
            det_row = db.execute(
                text("""
                    SELECT id FROM recetas_detalle
                    WHERE producto_id = :pid AND ingrediente_id = :iid
                """),
                {"pid": prod_id, "iid": ing_id},
            ).fetchone()

            if det_row:
                print(f"  ~ Receta-detalle para '{b['producto_nombre']}' ya existe")
            else:
                db.execute(
                    text("""
                        INSERT INTO recetas_detalle (producto_id, ingrediente_id, cantidad)
                        VALUES (:pid, :iid, 1.0)
                    """),
                    {"pid": prod_id, "iid": ing_id},
                )
                print(f"  + Receta-detalle: 1 {b['ing_unidad']} de '{b['ing_nombre']}' por venta")

        db.commit()
        print("=== Listo ===")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
