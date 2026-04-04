import { apiClient } from './client'
import type { Producto } from '../types'

export const getProductos = (solo_activos = true) =>
  apiClient.get<Producto[]>('/productos', { params: { solo_activos } })

export const getProducto = (id: number) =>
  apiClient.get<Producto>(`/productos/${id}`)

export const createProducto = (data: Partial<Producto>) =>
  apiClient.post<Producto>('/productos', data)

export const updateProducto = (id: number, data: Partial<Producto>) =>
  apiClient.patch<Producto>(`/productos/${id}`, data)

export const deleteProducto = (id: number) =>
  apiClient.delete(`/productos/${id}`)

export const getCategorias = () =>
  apiClient.get<{ id: number; nombre: string }[]>('/categorias')
