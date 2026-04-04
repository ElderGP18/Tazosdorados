import { apiClient } from './client'
import type { PrediccionDia, EstadoModelo } from '../types'

export const getEstadoModelo = () =>
  apiClient.get<EstadoModelo>('/predicciones/estado')

export const reentrenarModelo = () =>
  apiClient.post('/predicciones/reentrenar')

export const getPrediccionManana = () =>
  apiClient.get<PrediccionDia>('/predicciones/manana')

export const getPrediccion7Dias = () =>
  apiClient.get<PrediccionDia[]>('/predicciones/proximos-7-dias')

export const getPrediccionFecha = (fecha: string) =>
  apiClient.get<PrediccionDia>('/predicciones/fecha', { params: { fecha } })

export const getPrediccionRango = (fecha_inicio: string, dias: number) =>
  apiClient.get<PrediccionDia[]>('/predicciones/rango', { params: { fecha_inicio, dias } })
