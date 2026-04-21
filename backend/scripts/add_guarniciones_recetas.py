"""
- Agrega Limón como producto Q0 en Extras
- Agrega recetas para Salsa Roja, Salsa Verde y Limón
  (para que se rebaje stock al agregarlos a una venta)

Ejecución: python -m scripts.add_guarniciones_recetas  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal


# Recetas a agregar: {nombre_producto: [(nombre_ingrediente, cantidad), ...]}
RECETAS_GUARNICIONES = {
    "Salsa Roja": [
        ("Tomate",       Decimal("0.10")),
        ("Chile guaque", Decimal("0.02")),
        ("Cebolla",      Decimal("0.02")),
        ("Sal",          Decimal("0.005")),
        ("Aceite",       Decimal("0.02")),
    ],
    "Salsa Verde": [
        ("Tomate",         Decimal("0.10")),
        ("Chile pimiento", Decimal("0.02")),
        ("Cebolla",        Decimal("0.02")),
        ("Cilantro",       Decimal("0.01")),
        ("Sal",            Decimal("0.005")),
    ],
    "Limón": [
        ("Limón", Decimal("1")),
    ],
    "Guacamol": [   # ya existe, pero si alguien borró la receta se re-crea
        ("Aguacate", Decimal("1")),
        ("Cebolla",  Decimal("0.03")),
        ("Cilantro", Decimal("0.01")),
        ("Limón",    Decimal("1")),
        ("Sal",      Decimal("0.005")),
    ],
}


def get_or_create_product(db, nombre, descripcion, precio, categoria_nombre):
    row = db.execute(text("SELECT id FROM productos WHERE nombre = :n"), {"n": nombre}).fetchone()
    if row:
        return row[0], False
    cat = db.execute(text("SELECT id FROM categorias WHERE nombre = :n"), {"n": categoria_nombre}).fetchone()
    if not cat:
        db.execute(text("INSERT INTO categorias (nombre, activo) VALUES (:n, 1)"), {"n": categoria_nombre})
        db.flush()
        cat = db.execute(text("SELECT id FROM categorias WHERE nombre = :n"), {"n": categoria_nombre}).fetchone()
    db.execute(
        text("INSERT INTO productos (nombre, descripcion, precio, categoria_id, activo, created_at, updated_at) VALUES (:n, :d, :p, :c, 1, NOW(), NOW())"),
        {"n": nombre, "d": descripcion, "p": precio, "c": cat[0]},
    )
    db.flush()
    row = db.execute(text("SELECT id FROM productos WHERE nombre = :n"), {"n": nombre}).fetchone()
    return row[0], True


def run():
    db: Session = SessionLocal()
    print("=== Agregando recetas de guarniciones ===\n")
    try:
        # 1. Asegurar que Limón existe como producto
        lim_id, created = get_or_create_product(
            db, "Limón", "Limón fresco (guarnición gratis)", Decimal("0.00"), "Extras"
        )
        print(f"  {'✓ creado' if created else '~ ya existe'}: Limón (Q0)")
        db.commit()

        # 2. Crear/actualizar recetas
        print("\n[Recetas de guarniciones]")
        for prod_nombre, ingredientes in RECETAS_GUARNICIONES.items():
            row = db.execute(text("SELECT id FROM productos WHERE nombre = :n"), {"n": prod_nombre}).fetchone()
            if not row:
                print(f"  ! Producto no encontrado: {prod_nombre}")
                continue
            prod_id = row[0]

            for ing_nombre, cantidad in ingredientes:
                ing = db.execute(text("SELECT id FROM ingredientes WHERE nombre = :n"), {"n": ing_nombre}).fetchone()
                if not ing:
                    print(f"    ! Ingrediente no encontrado: {ing_nombre}")
                    continue
                existing = db.execute(
                    text("SELECT id FROM recetas_detalle WHERE producto_id = :p AND ingrediente_id = :i"),
                    {"p": prod_id, "i": ing[0]},
                ).fetchone()
                if existing:
                    db.execute(
                        text("UPDATE recetas_detalle SET cantidad = :c WHERE id = :id"),
                        {"c": cantidad, "id": existing[0]},
                    )
                else:
                    db.execute(
                        text("INSERT INTO recetas_detalle (producto_id, ingrediente_id, cantidad) VALUES (:p, :i, :c)"),
                        {"p": prod_id, "i": ing[0], "c": cantidad},
                    )
            print(f"  ✓ {prod_nombre}: {len(ingredientes)} ingrediente(s)")

        db.commit()
        print("\n=== Listo ===")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
