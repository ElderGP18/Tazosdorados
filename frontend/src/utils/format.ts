import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// El servidor guarda UTC sin sufijo de zona; agregamos 'Z' para que
// date-fns lo convierta correctamente a la hora local del navegador.
const asUTC = (s: string) =>
  /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z'

export const formatCurrency = (value: number): string => {
  const n = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `Q ${n}`
}

export const formatNumber = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('es-GT', { maximumFractionDigits: decimals }).format(value)

export const formatDate = (dateStr: string, fmt = 'dd/MM/yyyy'): string => {
  try {
    const d = parseISO(asUTC(dateStr))
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
