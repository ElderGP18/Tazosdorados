// ── Auth ─────────────────────────────────────────────
export interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ── Catálogos ─────────────────────────────────────────
export interface Rol {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol_id: number
  activo: boolean
  created_at: string
}

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string
  activo: boolean
}

// ── Productos ─────────────────────────────────────────
export interface Producto {
  id: number
  nombre: string
  descripcion?: string
  precio: number
  categoria_id?: number
  activo: boolean
  created_at: string
}

export interface ProductoForm {
  nombre: string
  descripcion: string
  precio: string
  categoria_id: string
}

// ── Ingredientes ──────────────────────────────────────
export interface Ingrediente {
  id: number
  nombre: string
  unidad_medida: string
  costo_unitario: number
  activo: boolean
  created_at: string
}

export interface IngredienteForm {
  nombre: string
  unidad_medida: string
  costo_unitario: string
}

// ── Recetas ───────────────────────────────────────────
export interface RecetaDetalle {
  id: number
  producto_id: number
  ingrediente_id: number
  cantidad: number
}

export interface RecetaDetalleForm {
  ingrediente_id: string
  cantidad: string
}

// ── Ventas ────────────────────────────────────────────
export interface DetalleVenta {
  id: number
  venta_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Venta {
  id: number
  fecha: string
  total: number
  metodo_pago: string
  usuario_id?: number
  notas?: string
  detalles: DetalleVenta[]
  created_at: string
}

export interface VentaForm {
  metodo_pago: string
  notas: string
  detalles: Array<{ producto_id: number; cantidad: number; precio_unitario: number }>
}

// ── Stock ─────────────────────────────────────────────
export interface Stock {
  id: number
  ingrediente_id: number
  cantidad_disponible: number
  cantidad_minima: number
  ultima_actualizacion: string
}

export interface MovimientoStock {
  id: number
  ingrediente_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  referencia?: string
  notas?: string
  fecha: string
}

// ── Predicciones ──────────────────────────────────────
export interface ProductoPrediccion {
  producto_id: number
  nombre: string
  unidades_predichas: number
  porcentaje: number
}

export interface PrediccionDia {
  fecha: string
  total_unidades: number
  productos: ProductoPrediccion[]
}

export interface EstadoModelo {
  modelo_disponible: boolean
  entrenado_en?: string
  dias_historicos?: number
  dias_con_features?: number
  mae_cv?: number
  rmse_cv?: number
}

// ── Feriados ──────────────────────────────────────────
export interface Feriado {
  id: number
  fecha: string
  descripcion: string
  tipo: string
  afecta_demanda: boolean
  created_at: string
}

// ── Recomendaciones / Merma (calculado en frontend) ──
export interface Recomendacion {
  ingrediente_id: number
  nombre: string
  unidad_medida: string
  stock_actual: number
  stock_minimo: number
  cantidad_sugerida: number
  prioridad: 'alta' | 'media' | 'baja'
}

export type NivelMerma = 'alto' | 'medio' | 'bajo'

export interface ItemMerma {
  ingrediente_id: number
  nombre: string
  unidad_medida: string
  cantidad_disponible: number
  cantidad_minima: number
  porcentaje_restante: number
  nivel: NivelMerma
}

// ── Recomendaciones de compra (ML backend) ────────────
export interface RecomendacionCompra {
  ingrediente_id: number
  nombre: string
  unidad_medida: string
  stock_actual: number
  cantidad_necesaria: number
  cantidad_a_comprar: number
  costo_estimado: number
  prioridad: 'alta' | 'media' | 'ok'
}

export interface RecomendacionesCompraResponse {
  dias_proyectados: number
  recomendaciones: RecomendacionCompra[]
}

// ── Merma / frescura (backend) ────────────────────────
export interface LoteMerma {
  cantidad: number
  fecha_ingreso: string
  dias_en_stock: number
  dias_restantes: number
  porcentaje_restante: number
  estado: 'ok' | 'medio' | 'alto' | 'vencido'
}

export interface ItemMermaFrescura {
  ingrediente_id: number
  nombre: string
  unidad_medida: string
  stock_actual: number
  vida_util_dias: number
  estado_general: 'ok' | 'medio' | 'alto' | 'vencido'
  lotes: LoteMerma[]
}

export interface RiesgoMermaResponse {
  ingredientes: ItemMermaFrescura[]
}
