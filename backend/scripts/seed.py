"""
Seed de datos iniciales para Tazos Dorados.
Ejecución: python -m scripts.seed  (desde backend/)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models import (
    Rol, Usuario, Categoria, Producto,
    Ingrediente, RecetaDetalle, Stock, Feriado,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def get_or_create(db: Session, model, defaults: dict, **kwargs):
    obj = db.query(model).filter_by(**kwargs).first()
    if obj:
        return obj, False
    obj = model(**kwargs, **defaults)
    db.add(obj)
    db.flush()
    return obj, True


# ── datos ─────────────────────────────────────────────────────────────────────

ROLES = [
    {"nombre": "admin",  "descripcion": "Acceso total al sistema"},
    {"nombre": "cajero", "descripcion": "Registro de ventas y consulta de productos"},
]

ADMIN_USER = {
    "nombre":   "Administrador",
    "email":    "admin@tazos.com",
    "password": "Admin1234!",
    "rol":      "admin",
}

CATEGORIAS = [
    "Tacos",
    "Quesadillas",
    "Bebidas",
    "Extras",
]

# (nombre, descripcion, precio, categoria)
PRODUCTOS = [
    # Tacos
    ("Taco al Pastor",       "Carne de marrano marinada con piña y especias",   25.00, "Tacos"),
    ("Taco de Carne Asada",  "Res a la parrilla con cebolla y cilantro",         28.00, "Tacos"),
    ("Taco de Pollo",        "Pollo a la plancha con chile pimiento",             22.00, "Tacos"),
    ("Taco de Chorizo",      "Chorizo chapín con frijoles volteados",             24.00, "Tacos"),
    ("Taco de Birria",       "Carne de res estofada en salsa roja",               30.00, "Tacos"),
    # Quesadillas
    ("Quesadilla de Queso",  "Queso blanco fundido en tortilla de maíz",         30.00, "Quesadillas"),
    ("Quesadilla al Pastor", "Queso blanco + carne al pastor",                   38.00, "Quesadillas"),
    ("Quesadilla de Pollo",  "Queso blanco + pollo a la plancha",                35.00, "Quesadillas"),
    # Bebidas
    ("Agua Fresca",          "Sabor del día (1 litro)",                           20.00, "Bebidas"),
    ("Refresco",             "350 ml",                                            18.00, "Bebidas"),
    ("Horchata",             "Horchata de arroz (500 ml)",                        25.00, "Bebidas"),
    # Extras
    ("Guacamol",             "100 g de guacamol fresco",                          20.00, "Extras"),
    ("Salsa Roja",           "Porción de salsa roja picante",                      8.00, "Extras"),
    ("Salsa Verde",          "Porción de salsa verde",                             8.00, "Extras"),
    ("Tortillas extra (3)",  "Tres tortillas de maíz",                            10.00, "Extras"),
]

# (nombre, unidad, costo_unitario, stock_inicial, stock_minimo)
INGREDIENTES = [
    ("Tortilla de maíz",    "unidad",  0.80,   500,  100),
    ("Carne de marrano",    "kg",     75.00,   10.0,   2.0),
    ("Carne de res",        "kg",     90.00,    8.0,   2.0),
    ("Pechuga de pollo",    "kg",     60.00,    8.0,   2.0),
    ("Chorizo chapín",      "kg",     80.00,    5.0,   1.0),
    ("Queso blanco",        "kg",     55.00,    5.0,   1.0),
    ("Cebolla",             "kg",     10.00,    5.0,   1.0),
    ("Cilantro",            "kg",     12.00,    2.0,   0.5),
    ("Tomate",              "kg",     10.00,    5.0,   1.0),
    ("Chile guaque",        "kg",     45.00,    2.0,   0.5),
    ("Chile pimiento",      "kg",     20.00,    2.0,   0.5),
    ("Piña",                "kg",     15.00,    3.0,   0.5),
    ("Aguacate",            "unidad",  8.00,   30,    10),
    ("Limón",               "unidad",  0.50,   50,    10),
    ("Frijoles negros",     "kg",     12.00,    5.0,   1.0),
    ("Crema",               "litro",  22.00,    2.0,   0.5),
    ("Sal",                 "kg",      4.00,    2.0,   0.5),
    ("Aceite",              "litro",  20.00,    3.0,   1.0),
]

# {nombre_producto: [(nombre_ingrediente, cantidad), ...]}
RECETAS = {
    "Taco al Pastor": [
        ("Tortilla de maíz",  2),
        ("Carne de marrano",  0.120),
        ("Piña",              0.030),
        ("Cebolla",           0.020),
        ("Cilantro",          0.010),
    ],
    "Taco de Carne Asada": [
        ("Tortilla de maíz",  2),
        ("Carne de res",      0.120),
        ("Cebolla",           0.020),
        ("Cilantro",          0.010),
    ],
    "Taco de Pollo": [
        ("Tortilla de maíz",  2),
        ("Pechuga de pollo",  0.120),
        ("Cebolla",           0.020),
        ("Cilantro",          0.010),
        ("Chile pimiento",    0.015),
    ],
    "Taco de Chorizo": [
        ("Tortilla de maíz",  2),
        ("Chorizo chapín",    0.100),
        ("Frijoles negros",   0.050),
        ("Cebolla",           0.020),
    ],
    "Taco de Birria": [
        ("Tortilla de maíz",  2),
        ("Carne de res",      0.150),
        ("Chile guaque",      0.020),
        ("Cebolla",           0.030),
        ("Cilantro",          0.010),
    ],
    "Quesadilla de Queso": [
        ("Tortilla de maíz",  2),
        ("Queso blanco",      0.100),
    ],
    "Quesadilla al Pastor": [
        ("Tortilla de maíz",  2),
        ("Queso blanco",      0.080),
        ("Carne de marrano",  0.100),
        ("Piña",              0.020),
    ],
    "Quesadilla de Pollo": [
        ("Tortilla de maíz",  2),
        ("Queso blanco",      0.080),
        ("Pechuga de pollo",  0.100),
    ],
    "Guacamol": [
        ("Aguacate",   1),
        ("Cebolla",    0.020),
        ("Cilantro",   0.010),
        ("Limón",      0.500),
        ("Sal",        0.005),
    ],
}

# Feriados de Guatemala 2025-2026
FERIADOS = [
    (date(2025,  1,  1), "Año Nuevo",                       "nacional"),
    (date(2025,  4, 17), "Jueves Santo",                    "nacional"),
    (date(2025,  4, 18), "Viernes Santo",                   "nacional"),
    (date(2025,  4, 19), "Sábado de Gloria",                "nacional"),
    (date(2025,  5,  1), "Día del Trabajo",                 "nacional"),
    (date(2025,  6, 30), "Día del Ejército de Guatemala",   "nacional"),
    (date(2025,  9, 15), "Día de la Independencia",         "nacional"),
    (date(2025, 10, 20), "Día de la Revolución",            "nacional"),
    (date(2025, 11,  1), "Día de Todos los Santos",         "nacional"),
    (date(2025, 12, 24), "Nochebuena",                      "nacional"),
    (date(2025, 12, 25), "Navidad",                         "nacional"),
    (date(2025, 12, 31), "Fin de Año",                      "nacional"),
    (date(2026,  1,  1), "Año Nuevo",                       "nacional"),
    (date(2026,  4,  2), "Jueves Santo",                    "nacional"),
    (date(2026,  4,  3), "Viernes Santo",                   "nacional"),
    (date(2026,  4,  4), "Sábado de Gloria",                "nacional"),
    (date(2026,  5,  1), "Día del Trabajo",                 "nacional"),
    (date(2026,  6, 30), "Día del Ejército de Guatemala",   "nacional"),
    (date(2026,  9, 15), "Día de la Independencia",         "nacional"),
    (date(2026, 10, 20), "Día de la Revolución",            "nacional"),
    (date(2026, 11,  1), "Día de Todos los Santos",         "nacional"),
    (date(2026, 12, 24), "Nochebuena",                      "nacional"),
    (date(2026, 12, 25), "Navidad",                         "nacional"),
    (date(2026, 12, 31), "Fin de Año",                      "nacional"),
]


# ── ejecución ─────────────────────────────────────────────────────────────────

def run():
    print("Iniciando seed de Tazos Dorados...")

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Roles
        print("\n[1/6] Roles...")
        rol_map: dict[str, Rol] = {}
        for r in ROLES:
            obj, created = get_or_create(db, Rol, {}, nombre=r["nombre"])
            obj.descripcion = r["descripcion"]
            rol_map[r["nombre"]] = obj
            print(f"  {'creado' if created else 'existe'}: {r['nombre']}")
        db.commit()

        # 2. Usuario admin
        print("\n[2/6] Usuario administrador...")
        admin, created = get_or_create(
            db, Usuario,
            defaults={
                "nombre": ADMIN_USER["nombre"],
                "password_hash": hash_password(ADMIN_USER["password"]),
                "rol_id": rol_map["admin"].id,
            },
            email=ADMIN_USER["email"],
        )
        print(f"  {'creado' if created else 'existe'}: {ADMIN_USER['email']}  |  pass: {ADMIN_USER['password']}")
        db.commit()

        # 3. Categorías y Productos
        print("\n[3/6] Categorías y Productos...")
        cat_map: dict[str, Categoria] = {}
        for nombre in CATEGORIAS:
            obj, _ = get_or_create(db, Categoria, {}, nombre=nombre)
            cat_map[nombre] = obj
        db.flush()

        prod_map: dict[str, Producto] = {}
        for nombre, desc, precio, cat in PRODUCTOS:
            obj, created = get_or_create(
                db, Producto,
                defaults={"descripcion": desc, "precio": Decimal(str(precio)),
                          "categoria_id": cat_map[cat].id},
                nombre=nombre,
            )
            prod_map[nombre] = obj
            print(f"  {'creado' if created else 'existe'}: {nombre}  Q{precio:.2f}")
        db.commit()

        # 4. Ingredientes + Stock inicial
        print("\n[4/6] Ingredientes y Stock...")
        ing_map: dict[str, Ingrediente] = {}
        for nombre, unidad, costo, stock_ini, stock_min in INGREDIENTES:
            ing, created = get_or_create(
                db, Ingrediente,
                defaults={"unidad_medida": unidad, "costo_unitario": Decimal(str(costo))},
                nombre=nombre,
            )
            ing_map[nombre] = ing
            db.flush()

            stock_obj = db.query(Stock).filter(Stock.ingrediente_id == ing.id).first()
            if not stock_obj:
                db.add(Stock(
                    ingrediente_id=ing.id,
                    cantidad_disponible=Decimal(str(stock_ini)),
                    cantidad_minima=Decimal(str(stock_min)),
                ))
            print(f"  {'creado' if created else 'existe'}: {nombre}  ({unidad})")
        db.commit()

        # 5. Recetas
        print("\n[5/6] Recetas base...")
        for prod_nombre, items in RECETAS.items():
            if prod_nombre not in prod_map:
                continue
            prod = prod_map[prod_nombre]
            for ing_nombre, cantidad in items:
                if ing_nombre not in ing_map:
                    continue
                ing = ing_map[ing_nombre]
                existing = (
                    db.query(RecetaDetalle)
                    .filter_by(producto_id=prod.id, ingrediente_id=ing.id)
                    .first()
                )
                if not existing:
                    db.add(RecetaDetalle(
                        producto_id=prod.id,
                        ingrediente_id=ing.id,
                        cantidad=Decimal(str(cantidad)),
                    ))
            print(f"  receta: {prod_nombre}  ({len(items)} ingredientes)")
        db.commit()

        # 6. Feriados Guatemala
        print("\n[6/6] Feriados Guatemala...")
        for fecha, descripcion, tipo in FERIADOS:
            obj, created = get_or_create(db, Feriado, {}, fecha=fecha)
            obj.descripcion = descripcion
            obj.tipo = tipo
            if created:
                print(f"  creado: {fecha}  {descripcion}")
        db.commit()

        print("\nSeed completado exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"\nError durante el seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
