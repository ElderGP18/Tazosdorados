import { apiClient } from './client'
import type { Ingrediente, RecetaDetalle } from '../types'

export const getIngredientes = (solo_activos = true) =>
  apiClient.get<Ingrediente[]>('/ingredientes', { params: { solo_activos } })

export const createIngrediente = (data: Partial<Ingrediente>) =>
  apiClient.post<Ingrediente>('/ingredientes', data)

export const updateIngrediente = (id: number, data: Partial<Ingrediente>) =>
  apiClient.patch<Ingrediente>(`/ingredientes/${id}`, data)

export const deleteIngrediente = (id: number) =>
  apiClient.patch<Ingrediente>(`/ingredientes/${id}`, { activo: false })

// Recetas
export const getRecetasPorProducto = (producto_id: number) =>
  apiClient.get<RecetaDetalle[]>('/recetas', { params: { producto_id } })

export const createRecetaDetalle = (data: { producto_id: number; ingrediente_id: number; cantidad: number }) =>
  apiClient.post<RecetaDetalle>('/recetas', data)

export const updateRecetaDetalle = (id: number, cantidad: number) =>
  apiClient.patch(`/recetas/${id}`, { cantidad })

export const deleteRecetaDetalle = (id: number) =>
  apiClient.delete(`/recetas/${id}`)
