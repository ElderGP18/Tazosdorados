import { apiClient } from './client'
import type { Venta, VentaForm } from '../types'

export const getVentas = (params?: { fecha_desde?: string; fecha_hasta?: string; limit?: number }) =>
  apiClient.get<Venta[]>('/ventas', { params })

export const getVenta = (id: number) =>
  apiClient.get<Venta>(`/ventas/${id}`)

export const createVenta = (data: VentaForm) =>
  apiClient.post<Venta>('/ventas', data)
