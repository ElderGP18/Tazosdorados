"""
Actualiza la base de datos de Tazos Dorados:
  - Tacos: porciones de 3 tacos con nuevos precios
  - Todos los ingredientes en kg → libras (lb)
  - Precios ajustados proporcionalmente
  - Recetas convertidas a lb (y x3 para tacos)
  - Stock y movimientos convertidos a lb

Ejecución: python -m scripts.update_precios_libras  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal

# ── Conversión ────────────────────────────────────────────────────────────────
KG_TO_LB = Decimal("2.20462")   # 1 kg = 2.20462 lb

# ── Nuevos precios de productos ───────────────────────────────────────────────
# Tacos ahora son porciones de 3 tacos
NUEVOS_PRODUCTOS = {
    "Taco al Pastor":       ("Porción de 3 tacos al pastor con carne de marrano, piña y especias",  40.00),
    "Taco de Carne Asada":  ("Porción de 3 tacos de res a la parrilla con cebolla y cilantro",       45.00),
    "Taco de Pollo":        ("Porción de 3 tacos de pollo a la plancha con chile pimiento",          38.00),
    "Taco de Chorizo":      ("Porción de 3 tacos de chorizo chapín con frijoles volteados",          40.00),
    "Taco de Birria":       ("Porción de 3 tacos de birria, carne estofada en salsa roja",           48.00),
    "Quesadilla de Queso":  ("Queso blanco fundido en tortilla de maíz",                             32.00),
    "Quesadilla al Pastor": ("Queso blanco + carne al pastor en tortilla de maíz",                   42.00),
    "Quesadilla de Pollo":  ("Queso blanco + pollo a la plancha en tortilla de maíz",                40.00),
    "Agua Fresca":          ("Sabor del día (1 litro)",                                               20.00),
    "Refresco":             ("350 ml",                                                                18.00),
    "Horchata":             ("Horchata de arroz (500 ml)",                                            25.00),
    "Guacamol":             ("100 g de guacamol fresco",                                              22.00),
    "Salsa Roja":           ("Porción de salsa roja picante",                                          8.00),
    "Salsa Verde":          ("Porción de salsa verde",                                                 8.00),
    "Tortillas extra (3)":  ("Tres tortillas de maíz",                                               10.00),
}

# Nombres de productos que son porciones de 3 tacos (recetas se multiplican x3)
TACOS = {
    "Taco al Pastor",
    "Taco de Carne Asada",
    "Taco de Pollo",
    "Taco de Chorizo",
    "Taco de Birria",
}

# Ingredientes que están en kg y deben pasar a lb
# Formato: nombre → nuevo costo_unitario en Q/lb (redondeado)
INGREDIENTES_KG_A_LB = {
    "Carne de marrano":  Decimal("34.00"),   # 75/2.20462 ≈ 34
    "Carne de res":      Decimal("41.00"),   # 90/2.20462 ≈ 41
    "Pechuga de pollo":  Decimal("27.00"),   # 60/2.20462 ≈ 27
    "Chorizo chapín":    Decimal("36.00"),   # 80/2.20462 ≈ 36
    "Queso blanco":      Decimal("25.00"),   # 55/2.20462 ≈ 25
    "Cebolla":           Decimal("4.50"),    # 10/2.20462 ≈  4.50
    "Cilantro":          Decimal("5.50"),    # 12/2.20462 ≈  5.50
    "Tomate":            Decimal("4.50"),    # 10/2.20462 ≈  4.50
    "Chile guaque":      Decimal("20.00"),   # 45/2.20462 ≈ 20
    "Chile pimiento":    Decimal("9.00"),    # 20/2.20462 ≈  9
    "Piña":              Decimal("7.00"),    # 15/2.20462 ≈  7
    "Frijoles negros":   Decimal("5.50"),    # 12/2.20462 ≈  5.50
    "Sal":               Decimal("2.00"),    #  4/2.20462 ≈  2
}


def run():
    db: Session = SessionLocal()
    print("=== Actualizando precios y unidades a libras ===\n")

    try:
        # ── 1. Actualizar precios y descripciones de productos ─────────────────
        print("[1/5] Productos — nuevos precios y descripciones...")
        for nombre, (desc, precio) in NUEVOS_PRODUCTOS.items():
            result = db.execute(
                text("UPDATE productos SET precio = :precio, descripcion = :desc WHERE nombre = :nombre"),
                {"precio": Decimal(str(precio)), "desc": desc, "nombre": nombre},
            )
            if result.rowcount:
                print(f"  ✓ {nombre}: Q{precio:.2f}")
            else:
                print(f"  ! No encontrado: {nombre}")
        db.commit()

        # ── 2. Actualizar unidad_medida y costo de ingredientes kg → lb ─────────
        print("\n[2/5] Ingredientes — kg → lb y nuevo costo/lb...")

        # Obtenemos los IDs de los ingredientes que cambian (para el paso de stock/movimientos)
        ids_kg: dict[str, int] = {}
        for nombre, nuevo_costo in INGREDIENTES_KG_A_LB.items():
            row = db.execute(
                text("SELECT id, unidad_medida FROM ingredientes WHERE nombre = :nombre"),
                {"nombre": nombre},
            ).fetchone()
            if not row:
                print(f"  ! No encontrado: {nombre}")
                continue
            ing_id, unidad_actual = row
            if unidad_actual == "lb":
                print(f"  ~ Ya en lb: {nombre}")
                ids_kg[nombre] = ing_id
                continue
            db.execute(
                text("""UPDATE ingredientes
                        SET unidad_medida = 'lb', costo_unitario = :costo
                        WHERE id = :id"""),
                {"costo": nuevo_costo, "id": ing_id},
            )
            ids_kg[nombre] = ing_id
            print(f"  ✓ {nombre}: kg→lb, Q{nuevo_costo}/lb")
        db.commit()

        # ── 3. Convertir stock actual y mínimos de kg → lb ─────────────────────
        print("\n[3/5] Stock — convertir cantidades kg → lb...")
        for nombre, ing_id in ids_kg.items():
            row = db.execute(
                text("SELECT cantidad_disponible, cantidad_minima FROM stock WHERE ingrediente_id = :id"),
                {"id": ing_id},
            ).fetchone()
            if not row:
                continue
            disp, minimo = Decimal(str(row[0])), Decimal(str(row[1]))
            # Solo convertir si aún parecen estar en escala kg (< 20 ≈ razonable en kg para un restaurante)
            nueva_disp  = (disp  * KG_TO_LB).quantize(Decimal("0.01"))
            nuevo_min   = (minimo * KG_TO_LB).quantize(Decimal("0.01"))
            db.execute(
                text("""UPDATE stock
                        SET cantidad_disponible = :disp, cantidad_minima = :min
                        WHERE ingrediente_id = :id"""),
                {"disp": nueva_disp, "min": nuevo_min, "id": ing_id},
            )
            print(f"  ✓ {nombre}: disp {float(disp):.2f}→{float(nueva_disp):.2f} lb  |  min {float(minimo):.2f}→{float(nuevo_min):.2f} lb")
        db.commit()

        # ── 4. Convertir movimientos de stock kg → lb ──────────────────────────
        print("\n[4/5] Movimientos de stock — convertir cantidades kg → lb...")
        for nombre, ing_id in ids_kg.items():
            result = db.execute(
                text("""UPDATE movimientos_stock
                        SET cantidad = ROUND(cantidad * :factor, 4)
                        WHERE ingrediente_id = :id"""),
                {"factor": float(KG_TO_LB), "id": ing_id},
            )
            if result.rowcount:
                print(f"  ✓ {nombre}: {result.rowcount} movimiento(s) convertido(s)")
        db.commit()

        # ── 5. Actualizar recetas ──────────────────────────────────────────────
        print("\n[5/5] Recetas — convertir cantidades a lb y x3 para tacos...")
        # Obtenemos IDs de productos taco
        taco_ids: set[int] = set()
        for nombre in TACOS:
            row = db.execute(
                text("SELECT id FROM productos WHERE nombre = :nombre"),
                {"nombre": nombre},
            ).fetchone()
            if row:
                taco_ids.add(row[0])

        # Para cada ingrediente que cambia de kg a lb: actualizar cantidad en recetas
        for nombre, ing_id in ids_kg.items():
            # Traemos todas las recetas que usan este ingrediente
            recetas = db.execute(
                text("SELECT id, producto_id, cantidad FROM recetas_detalle WHERE ingrediente_id = :id"),
                {"id": ing_id},
            ).fetchall()
            for rec_id, prod_id, cantidad in recetas:
                cant = Decimal(str(cantidad))
                # Convertir kg→lb
                nueva_cant = cant * KG_TO_LB
                # Si es taco (porción de 3), multiplicar x3
                if prod_id in taco_ids:
                    nueva_cant = nueva_cant * 3
                nueva_cant = nueva_cant.quantize(Decimal("0.0001"))
                db.execute(
                    text("UPDATE recetas_detalle SET cantidad = :c WHERE id = :id"),
                    {"c": nueva_cant, "id": rec_id},
                )
            if recetas:
                print(f"  ✓ {nombre}: {len(recetas)} receta(s) actualizada(s)")

        # Tortillas de maíz: se cuentan en unidades, solo multiplicar x3 para tacos
        row = db.execute(
            text("SELECT id FROM ingredientes WHERE nombre = 'Tortilla de maíz'"),
        ).fetchone()
        if row:
            tort_id = row[0]
            for taco_prod_id in taco_ids:
                receta = db.execute(
                    text("SELECT id, cantidad FROM recetas_detalle WHERE ingrediente_id = :i AND producto_id = :p"),
                    {"i": tort_id, "p": taco_prod_id},
                ).fetchone()
                if receta:
                    nueva_cant = Decimal(str(receta[1])) * 3
                    db.execute(
                        text("UPDATE recetas_detalle SET cantidad = :c WHERE id = :id"),
                        {"c": nueva_cant, "id": receta[0]},
                    )
            print(f"  ✓ Tortilla de maíz: tortillas x3 para porciones de taco")

        # Limón también está en unidades: convertir proporciones en recetas que contengan limón
        # (el guacamol usa 0.5 unidades de limón — eso ya es correcto en unidades)

        db.commit()
        print("\n=== Actualización completada exitosamente ===")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
