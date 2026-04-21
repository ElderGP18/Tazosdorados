"""
Agrega Picante como producto Q0 con receta.
Ejecución: python -m scripts.add_picante  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal


def run():
    db: Session = SessionLocal()
    print("=== Agregando Picante ===")
    try:
        # Crear producto Picante si no existe
        row = db.execute(text("SELECT id FROM productos WHERE nombre = 'Picante'")).fetchone()
        if row:
            prod_id = row[0]
            db.execute(text("UPDATE productos SET precio = 0, activo = 1 WHERE id = :id"), {"id": prod_id})
            print("  ~ Picante ya existe, precio -> Q0")
        else:
            cat = db.execute(text("SELECT id FROM categorias WHERE nombre = 'Extras'")).fetchone()
            db.execute(
                text("INSERT INTO productos (nombre, descripcion, precio, categoria_id, activo, created_at, updated_at) VALUES ('Picante', 'Salsa picante (guarnicion gratis)', 0, :c, 1, NOW(), NOW())"),
                {"c": cat[0]},
            )
            db.flush()
            row = db.execute(text("SELECT id FROM productos WHERE nombre = 'Picante'")).fetchone()
            prod_id = row[0]
            print("  + Picante creado (Q0)")

        # Receta: chile guaque + tomate + sal
        receta = [
            ("Chile guaque", Decimal("0.02")),
            ("Tomate",       Decimal("0.05")),
            ("Sal",          Decimal("0.005")),
        ]
        db.execute(text("DELETE FROM recetas_detalle WHERE producto_id = :p"), {"p": prod_id})
        for ing_nombre, cantidad in receta:
            ing = db.execute(text("SELECT id FROM ingredientes WHERE nombre = :n"), {"n": ing_nombre}).fetchone()
            if ing:
                db.execute(
                    text("INSERT INTO recetas_detalle (producto_id, ingrediente_id, cantidad) VALUES (:p, :i, :c)"),
                    {"p": prod_id, "i": ing[0], "c": cantidad},
                )
                print(f"    + {ing_nombre}: {cantidad}")

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
