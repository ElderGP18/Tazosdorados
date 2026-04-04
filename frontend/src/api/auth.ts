import { apiClient } from './client'
import type { TokenResponse, Usuario } from '../types'

export const login = (email: string, password: string) =>
  apiClient.post<TokenResponse>('/auth/login', { email, password })

export const getMe = (id: number) =>
  apiClient.get<Usuario>(`/usuarios/${id}`)

export const getRoles = () =>
  apiClient.get<{ id: number; nombre: string }[]>('/roles')
