import { apiClient } from './client'
import type { Stock, MovimientoStock } from '../types'

export const getStock = () =>
  apiClient.get<Stock[]>('/stock')

export const getStockAlertas = () =>
  apiClient.get<Stock[]>('/stock/alertas')

export const getAllMovimientos = (limit = 100) =>
  apiClient.get<MovimientoStock[]>('/stock/movimientos', { params: { limit } })

export const getMovimientos = (ingrediente_id: number, limit = 30) =>
  apiClient.get<MovimientoStock[]>(`/stock/movimientos/${ingrediente_id}`, { params: { limit } })

export const registrarMovimiento = (data: {
  ingrediente_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  referencia?: string
  notas?: string
}) => apiClient.post<MovimientoStock>('/stock/movimientos', data)
