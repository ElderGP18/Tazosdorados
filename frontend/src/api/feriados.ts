import { apiClient } from './client'
import type { Feriado } from '../types'

export const getFeriados = () =>
  apiClient.get<Feriado[]>('/feriados')

export const createFeriado = (data: Partial<Feriado>) =>
  apiClient.post<Feriado>('/feriados', data)

export const updateFeriado = (id: number, data: Partial<Feriado>) =>
  apiClient.patch<Feriado>(`/feriados/${id}`, data)

export const deleteFeriado = (id: number) =>
  apiClient.delete(`/feriados/${id}`)
