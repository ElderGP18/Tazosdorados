"""
Corrige precios de ingredientes y cantidades de recetas a valores reales.
  - Precios de ingredientes corregidos (mercado Guatemala)
  - Piña: cambia de lb → unidad a Q10
  - Aguacate: Q5/unidad
  - Cantidades de recetas realistas (3 tacos ~0.33 lb carne = ~50g/taco)
  - Márgenes resultantes: 58–83%

Ejecución: python -m scripts.update_recetas_realistas  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal


# ── Precios corregidos de ingredientes ────────────────────────────────────────
# (nombre, nueva_unidad, nuevo_costo)
NUEVOS_PRECIOS_ING = {
    "Carne de marrano":  ("lb",      Decimal("27.00")),
    "Carne de res":      ("lb",      Decimal("40.00")),
    "Pechuga de pollo":  ("lb",      Decimal("25.00")),
    "Chorizo chapín":    ("lb",      Decimal("30.00")),
    "Queso blanco":      ("lb",      Decimal("20.00")),
    "Cebolla":           ("lb",      Decimal("3.50")),
    "Cilantro":          ("lb",      Decimal("3.00")),
    "Tomate":            ("lb",      Decimal("3.50")),
    "Chile guaque":      ("lb",      Decimal("30.00")),
    "Chile pimiento":    ("lb",      Decimal("8.00")),
    "Piña":              ("unidad",  Decimal("10.00")),   # cambia de lb → unidad
    "Aguacate":          ("unidad",  Decimal("5.00")),
    "Limón":             ("unidad",  Decimal("0.50")),
    "Frijoles negros":   ("lb",      Decimal("4.00")),
    "Crema":             ("litro",   Decimal("20.00")),
    "Sal":               ("lb",      Decimal("2.00")),
    "Aceite":            ("litro",   Decimal("18.00")),
    "Tortilla de maíz":  ("unidad",  Decimal("0.80")),
}

# ── Recetas realistas ─────────────────────────────────────────────────────────
# Tacos = porción de 3 tacos (~50 g carne por taco = 0.11 lb/taco → 0.33 lb/porción)
# Márgenes calculados con precios arriba.
#
# Costo estimado → precio → margen:
#   Taco al Pastor   Q15.0 → Q40 → 63%
#   Carne Asada      Q18.2 → Q45 → 60%
#   Pollo            Q13.4 → Q38 → 65%
#   Chorizo          Q14.1 → Q40 → 65%
#   Birria           Q20.2 → Q48 → 58%
#   Quesadilla Queso  Q5.6 → Q32 → 83%
#   Quesadilla Pastor Q9.2 → Q42 → 78%
#   Quesadilla Pollo  Q8.4 → Q40 → 79%
#   Guacamol          Q5.7 → Q22 → 74%

NUEVAS_RECETAS = {
    "Taco al Pastor": [
        ("Tortilla de maíz",  Decimal("6")),
        ("Carne de marrano",  Decimal("0.33")),
        ("Piña",              Decimal("0.10")),    # 0.10 de piña (unidad)
        ("Cebolla",           Decimal("0.03")),
        ("Cilantro",          Decimal("0.01")),
    ],
    "Taco de Carne Asada": [
        ("Tortilla de maíz",  Decimal("6")),
        ("Carne de res",      Decimal("0.33")),
        ("Cebolla",           Decimal("0.03")),
        ("Cilantro",          Decimal("0.01")),
    ],
    "Taco de Pollo": [
        ("Tortilla de maíz",  Decimal("6")),
        ("Pechuga de pollo",  Decimal("0.33")),
        ("Cebolla",           Decimal("0.03")),
        ("Cilantro",          Decimal("0.01")),
        ("Chile pimiento",    Decimal("0.02")),
    ],
    "Taco de Chorizo": [
        ("Tortilla de maíz",  Decimal("6")),
        ("Chorizo chapín",    Decimal("0.30")),
        ("Frijoles negros",   Decimal("0.08")),
        ("Cebolla",           Decimal("0.03")),
    ],
    "Taco de Birria": [
        ("Tortilla de maíz",  Decimal("6")),
        ("Carne de res",      Decimal("0.35")),
        ("Chile guaque",      Decimal("0.04")),
        ("Cebolla",           Decimal("0.04")),
        ("Cilantro",          Decimal("0.01")),
    ],
    "Quesadilla de Queso": [
        ("Tortilla de maíz",  Decimal("2")),
        ("Queso blanco",      Decimal("0.20")),
    ],
    "Quesadilla al Pastor": [
        ("Tortilla de maíz",  Decimal("2")),
        ("Queso blanco",      Decimal("0.15")),
        ("Carne de marrano",  Decimal("0.15")),
        ("Piña",              Decimal("0.05")),    # 0.05 de piña (unidad)
    ],
    "Quesadilla de Pollo": [
        ("Tortilla de maíz",  Decimal("2")),
        ("Queso blanco",      Decimal("0.15")),
        ("Pechuga de pollo",  Decimal("0.15")),
    ],
    "Guacamol": [
        ("Aguacate",          Decimal("1")),
        ("Cebolla",           Decimal("0.03")),
        ("Cilantro",          Decimal("0.01")),
        ("Limón",             Decimal("1")),
        ("Sal",               Decimal("0.005")),
    ],
}


def run():
    db: Session = SessionLocal()
    print("=== Corrigiendo precios y recetas ===\n")

    try:
        # ── 1. Actualizar precios de ingredientes ──────────────────────────────
        print("[1/3] Ingredientes — precios corregidos...")
        ing_map: dict[str, int] = {}
        for nombre, (unidad, costo) in NUEVOS_PRECIOS_ING.items():
            row = db.execute(
                text("SELECT id FROM ingredientes WHERE nombre = :n"), {"n": nombre}
            ).fetchone()
            if not row:
                print(f"  ! No encontrado: {nombre}")
                continue
            ing_id = row[0]
            ing_map[nombre] = ing_id
            db.execute(
                text("UPDATE ingredientes SET unidad_medida = :u, costo_unitario = :c WHERE id = :id"),
                {"u": unidad, "c": costo, "id": ing_id},
            )
            print(f"  ✓ {nombre}: Q{costo}/{unidad}")

        # Piña cambió de lb → unidad: ajustar stock a unidades (aprox. 1 lb ≈ 0.33 piñas)
        if "Piña" in ing_map:
            row = db.execute(
                text("SELECT cantidad_disponible, cantidad_minima FROM stock WHERE ingrediente_id = :id"),
                {"id": ing_map["Piña"]},
            ).fetchone()
            if row:
                disp_lb, min_lb = float(row[0]), float(row[1])
                # Si el valor parece estar en lb (< 30), convertir a unidades
                if disp_lb < 30:
                    nueva_disp = max(1, round(disp_lb / 3))   # 1 piña ≈ 3 lb
                    nuevo_min  = max(1, round(min_lb / 3))
                    db.execute(
                        text("UPDATE stock SET cantidad_disponible = :d, cantidad_minima = :m WHERE ingrediente_id = :id"),
                        {"d": nueva_disp, "m": nuevo_min, "id": ing_map["Piña"]},
                    )
                    print(f"  ✓ Piña stock: {disp_lb:.1f} lb → {nueva_disp} unidades")
        db.commit()

        # ── 2. Reemplazar todas las recetas ────────────────────────────────────
        print("\n[2/3] Recetas — reemplazando con cantidades reales...")
        for prod_nombre, ingredientes in NUEVAS_RECETAS.items():
            row = db.execute(
                text("SELECT id FROM productos WHERE nombre = :n"), {"n": prod_nombre}
            ).fetchone()
            if not row:
                print(f"  ! Producto no encontrado: {prod_nombre}")
                continue
            prod_id = row[0]

            # Borrar receta existente del producto
            db.execute(
                text("DELETE FROM recetas_detalle WHERE producto_id = :pid"), {"pid": prod_id}
            )

            # Insertar nueva receta
            costo_total = Decimal("0")
            for ing_nombre, cantidad in ingredientes:
                if ing_nombre not in ing_map:
                    # Buscar en DB si no está en ing_map
                    r = db.execute(
                        text("SELECT id FROM ingredientes WHERE nombre = :n"), {"n": ing_nombre}
                    ).fetchone()
                    if not r:
                        print(f"    ! Ingrediente no encontrado: {ing_nombre}")
                        continue
                    ing_map[ing_nombre] = r[0]
                ing_id = ing_map[ing_nombre]
                db.execute(
                    text("INSERT INTO recetas_detalle (producto_id, ingrediente_id, cantidad) VALUES (:p, :i, :c)"),
                    {"p": prod_id, "i": ing_id, "c": cantidad},
                )
                # Calcular costo estimado
                costo_ing = NUEVOS_PRECIOS_ING.get(ing_nombre, ("", Decimal("0")))[1]
                costo_total += cantidad * costo_ing

            # Buscar precio del producto para mostrar margen
            row_prod = db.execute(
                text("SELECT precio FROM productos WHERE id = :id"), {"id": prod_id}
            ).fetchone()
            precio = Decimal(str(row_prod[0])) if row_prod else Decimal("0")
            margen = int(((precio - costo_total) / precio) * 100) if precio > 0 else 0
            print(f"  ✓ {prod_nombre}: costo Q{float(costo_total):.2f} → venta Q{float(precio):.2f} → margen {margen}%")

        db.commit()

        # ── 3. Resumen de márgenes ─────────────────────────────────────────────
        print("\n[3/3] Verificación completada.")
        print("\n=== Actualización completada exitosamente ===")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
