import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

export const formatNumber = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: decimals }).format(value)

export const formatDate = (dateStr: string, fmt = 'dd/MM/yyyy'): string => {
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, fmt, { locale: es }) : dateStr
  } catch {
    return dateStr
  }
}

export const formatDateTime = (dateStr: string): string =>
  formatDate(dateStr, "dd/MM/yyyy HH:mm")

export const formatDateShort = (dateStr: string): string =>
  formatDate(dateStr, 'dd MMM')

export const today = (): string => format(new Date(), 'yyyy-MM-dd')

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)
