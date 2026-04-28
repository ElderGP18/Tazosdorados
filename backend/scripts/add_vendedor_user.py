"""
Crea el rol 'vendedor' y un usuario vendedor por defecto.
Ejecución: python -m scripts.add_vendedor_user  (desde backend/)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import text
import bcrypt

from app.core.database import SessionLocal


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()


def run():
    db: Session = SessionLocal()
    print("=== Creando rol vendedor y usuario ===")
    try:
        # 1. Crear o verificar rol "vendedor"
        row = db.execute(text("SELECT id FROM roles WHERE nombre = 'vendedor'")).fetchone()
        if row:
            rol_id = row[0]
            print("  ~ Rol vendedor ya existe")
        else:
            db.execute(
                text("INSERT INTO roles (nombre, descripcion, activo, created_at) VALUES ('vendedor', 'Registro de ventas y entradas de stock', 1, NOW())"),
            )
            db.flush()
            rol_id = db.execute(text("SELECT id FROM roles WHERE nombre = 'vendedor'")).fetchone()[0]
            print(f"  + Rol vendedor creado (id={rol_id})")

        # 2. Crear usuario vendedor si no existe
        row = db.execute(text("SELECT id FROM usuarios WHERE email = 'vendedor@tazos.com'")).fetchone()
        if row:
            print("  ~ Usuario vendedor@tazos.com ya existe")
        else:
            pw_hash = hash_pw("Vendedor123!")
            db.execute(
                text("""INSERT INTO usuarios (nombre, email, password_hash, rol_id, activo, created_at, updated_at)
                        VALUES ('Vendedor', 'vendedor@tazos.com', :pw, :rol, 1, NOW(), NOW())"""),
                {"pw": pw_hash, "rol": rol_id},
            )
            print("  + Usuario creado:")
            print("      Email:    vendedor@tazos.com")
            print("      Password: Vendedor123!")

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
