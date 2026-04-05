"""
- Guacamol, Salsa Roja, Salsa Verde → Q0 (guarniciones gratis, siguen rebajando stock)
- Refresco → Q10
- Agua Fresca → Q15
- Horchata → desactivar

Ejecución: python -m scripts.update_guarniciones  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal


CAMBIOS_PRECIO = {
    "Guacamol":    Decimal("0.00"),
    "Salsa Roja":  Decimal("0.00"),
    "Salsa Verde": Decimal("0.00"),
    "Refresco":    Decimal("10.00"),
    "Agua Fresca": Decimal("15.00"),
}

DESACTIVAR = ["Horchata"]


def run():
    db: Session = SessionLocal()
    print("=== Actualizando guarniciones y bebidas ===\n")
    try:
        for nombre, precio in CAMBIOS_PRECIO.items():
            r = db.execute(
                text("UPDATE productos SET precio = :p WHERE nombre = :n"),
                {"p": precio, "n": nombre},
            )
            label = "gratis" if precio == 0 else f"Q{float(precio):.2f}"
            print(f"  ✓ {nombre}: {label}  ({r.rowcount} fila)")

        for nombre in DESACTIVAR:
            r = db.execute(
                text("UPDATE productos SET activo = 0 WHERE nombre = :n"),
                {"n": nombre},
            )
            print(f"  ✓ {nombre}: desactivado  ({r.rowcount} fila)")

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
