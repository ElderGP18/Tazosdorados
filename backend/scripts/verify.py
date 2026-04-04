"""
Verifica que el backend puede leer y guardar datos en MySQL.
Ejecución: python -m scripts.verify  (desde backend/)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from app.core.database import SessionLocal, check_db_connection
from app.models import (
    Rol, Usuario, Categoria, Producto,
    Ingrediente, RecetaDetalle, Stock,
    Venta, DetalleVenta,
)

PASS = "✅"
FAIL = "❌"


def check(label: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    suffix = f"  → {detail}" if detail else ""
    print(f"  {status}  {label}{suffix}")
    return condition


def run():
    print("🔍 Verificando base de datos de Tazos Dorados...\n")

    # 1. Conexión
    print("[1] Conexión a MySQL")
    if not check("Conectar a MySQL", check_db_connection()):
        print("\n❌ Sin conexión. Verifica .env y que MySQL esté corriendo.")
        sys.exit(1)

    db = SessionLocal()
    errors = 0

    try:
        # 2. Tablas con datos
        print("\n[2] Datos de seed")
        roles = db.query(Rol).all()
        errors += not check("Roles cargados", len(roles) >= 3, f"{len(roles)} roles")

        admin = db.query(Usuario).filter(Usuario.email == "admin@tazos.com").first()
        errors += not check("Usuario admin existe", admin is not None,
                            admin.nombre if admin else "no encontrado")

        productos = db.query(Producto).filter(Producto.activo == True).all()
        errors += not check("Productos cargados", len(productos) >= 10,
                            f"{len(productos)} productos activos")

        ingredientes = db.query(Ingrediente).filter(Ingrediente.activo == True).all()
        errors += not check("Ingredientes cargados", len(ingredientes) >= 15,
                            f"{len(ingredientes)} ingredientes")

        recetas = db.query(RecetaDetalle).all()
        errors += not check("Recetas cargadas", len(recetas) >= 10,
                            f"{len(recetas)} líneas de receta")

        stock_items = db.query(Stock).all()
        errors += not check("Stock inicial cargado", len(stock_items) >= 10,
                            f"{len(stock_items)} registros de stock")

        # 3. Prueba de escritura: crear venta temporal y borrarla
        print("\n[3] Prueba de escritura")
        prod = db.query(Producto).filter(Producto.activo == True).first()
        venta = Venta(
            metodo_pago="efectivo",
            notas="venta_test_verify",
            total=Decimal(str(prod.precio)),
            detalles=[
                DetalleVenta(
                    producto_id=prod.id,
                    cantidad=1,
                    precio_unitario=prod.precio,
                    subtotal=prod.precio,
                )
            ],
        )
        db.add(venta)
        db.commit()
        db.refresh(venta)

        venta_leida = db.query(Venta).filter(Venta.id == venta.id).first()
        errors += not check(
            "Escribir y leer venta",
            venta_leida is not None and len(venta_leida.detalles) == 1,
            f"venta_id={venta.id}  total=${venta.total}",
        )

        # Cleanup
        db.delete(venta_leida)
        db.commit()
        check("Eliminar venta de prueba", True)

        # 4. Relaciones
        print("\n[4] Relaciones ORM")
        if admin:
            errors += not check("Relación usuario → rol", admin.rol is not None,
                                admin.rol.nombre if admin.rol else "sin rol")

        prod_con_receta = (
            db.query(Producto)
            .join(RecetaDetalle, RecetaDetalle.producto_id == Producto.id)
            .first()
        )
        errors += not check(
            "Relación producto → receta → ingrediente",
            prod_con_receta is not None and len(prod_con_receta.recetas) > 0,
            f"{prod_con_receta.nombre if prod_con_receta else '—'}  "
            f"({len(prod_con_receta.recetas) if prod_con_receta else 0} ingredientes)",
        )

        # 5. Resumen
        print(f"\n{'='*45}")
        if errors == 0:
            print("✅ Todas las verificaciones pasaron. El backend está listo.")
        else:
            print(f"⚠️  {errors} verificación(es) fallaron. Revisa los detalles arriba.")

    except Exception as e:
        print(f"\n{FAIL} Error inesperado: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
