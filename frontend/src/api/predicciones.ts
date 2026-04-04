import { apiClient } from './client'
import type { PrediccionDia, EstadoModelo, RecomendacionesCompraResponse, RiesgoMermaResponse } from '../types'

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

export const getRecomendacionesCompra = (dias = 7) =>
  apiClient.get<RecomendacionesCompraResponse>('/predicciones/recomendaciones-compra', { params: { dias } })

export const getRiesgoMerma = () =>
  apiClient.get<RiesgoMermaResponse>('/predicciones/riesgo-merma')
