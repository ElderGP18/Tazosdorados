from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.usuario import Usuario
from app.schemas.usuario import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == data.email).first()

    # Diagnostico claro: ¿el email existe? ¿esta activo? ¿pass correcto?
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas (usuario no encontrado)",
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado. Contacta al administrador.",
        )
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas (contraseña incorrecta)",
        )

    token = create_access_token(
        subject=user.id,
        extra={"nombre": user.nombre, "rol": user.rol.nombre if user.rol else "cajero"},
    )
    return {"access_token": token}


@router.get("/ping")
def ping():
    """Endpoint publico para probar que el API responde y el CORS esta activo."""
    return {"status": "ok", "service": "tazos-dorados-api"}
