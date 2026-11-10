"""
Resetea la contrasena del admin y lo activa.
Si el usuario no existe, lo crea.

El password se toma de la variable de entorno ADMIN_RESET_PASSWORD.
Si no esta definida, usa la del seed por defecto (ver scripts/seed.py).

Uso desde Railway (Shell del servicio):
    ADMIN_RESET_PASSWORD='TuNuevaPass!' python -m scripts.reset_admin_password

Uso local:
    cd backend
    ADMIN_RESET_PASSWORD='TuNuevaPass!' python -m scripts.reset_admin_password

Sin variable de entorno:
    python -m scripts.reset_admin_password
    # usa el password por defecto del seed
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import bcrypt as _bcrypt
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal
from scripts.seed import ADMIN_USER  # reutiliza el email/nombre/password por defecto


ADMIN_EMAIL = ADMIN_USER["email"]
ADMIN_NOMBRE = ADMIN_USER["nombre"]
# Prioridad: variable de entorno > password del seed por defecto
ADMIN_PASSWORD = os.environ.get("ADMIN_RESET_PASSWORD") or ADMIN_USER["password"]


def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt(rounds=12)).decode()


def run() -> None:
    db: Session = SessionLocal()
    try:
        # 1) Asegurar que el rol 'admin' existe
        row = db.execute(
            text("SELECT id FROM roles WHERE nombre = 'admin'")
        ).fetchone()
        if row is None:
            db.execute(
                text("INSERT INTO roles (nombre, descripcion) "
                     "VALUES ('admin', 'Acceso total al sistema')")
            )
            db.commit()
            row = db.execute(
                text("SELECT id FROM roles WHERE nombre = 'admin'")
            ).fetchone()
            print("Rol admin creado.")
        rol_admin_id = row[0]
        print(f"Rol admin id = {rol_admin_id}")

        # 2) Hash de la nueva contrasena
        new_hash = hash_password(ADMIN_PASSWORD)

        # 3) Upsert del usuario admin
        user_row = db.execute(
            text("SELECT id FROM usuarios WHERE email = :email"),
            {"email": ADMIN_EMAIL},
        ).fetchone()

        if user_row is None:
            db.execute(
                text("""
                    INSERT INTO usuarios
                        (nombre, email, password_hash, rol_id, activo, created_at, updated_at)
                    VALUES
                        (:nombre, :email, :h, :rol, 1, NOW(), NOW())
                """),
                {
                    "nombre": ADMIN_NOMBRE,
                    "email":  ADMIN_EMAIL,
                    "h":      new_hash,
                    "rol":    rol_admin_id,
                },
            )
            db.commit()
            print(f"Usuario admin creado: {ADMIN_EMAIL}")
        else:
            db.execute(
                text("""
                    UPDATE usuarios
                       SET password_hash = :h,
                           activo        = 1,
                           rol_id        = :rol,
                           updated_at    = NOW()
                     WHERE email = :email
                """),
                {"h": new_hash, "rol": rol_admin_id, "email": ADMIN_EMAIL},
            )
            db.commit()
            print(f"Password reseteado para {ADMIN_EMAIL}")

        # 4) Verificar que el hash es valido (sanidad check)
        row2 = db.execute(
            text("SELECT password_hash, activo FROM usuarios WHERE email = :email"),
            {"email": ADMIN_EMAIL},
        ).fetchone()
        ok = _bcrypt.checkpw(ADMIN_PASSWORD.encode(), row2[0].encode())
        activo = bool(row2[1])
        print(f"Verificacion: hash valido = {ok}  activo = {activo}")
        if not ok:
            print("ERROR: el hash recien guardado no verifica. Revisa la instalacion de bcrypt.")
            sys.exit(1)

        print("\nListo. Ya podes iniciar sesion con el email y el password configurado.")

    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
