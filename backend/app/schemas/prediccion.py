from pydantic import BaseModel


class ProductoPrediccionOut(BaseModel):
    producto_id: int
    nombre: str
    unidades_predichas: float
    porcentaje: float


class PrediccionDiaOut(BaseModel):
    fecha: str
    total_unidades: float
    productos: list[ProductoPrediccionOut]


class EstadoModeloOut(BaseModel):
    modelo_disponible: bool
    entrenado_en: str | None = None
    dias_historicos: int | None = None
    dias_con_features: int | None = None
    mae_cv: float | None = None
    rmse_cv: float | None = None


class ReentrenarOut(BaseModel):
    status: str
    dias_historicos: int
    dias_con_features: int
    mae_cv: float
    rmse_cv: float
    entrenado_en: str
