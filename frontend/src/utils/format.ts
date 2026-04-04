import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// Guatemala no tiene horario de verano, siempre UTC-6
const TZ = 'America/Guatemala'

// El servidor devuelve UTC sin sufijo; añadimos 'Z' para que Date() lo interprete como UTC
const asUTC = (s: string) =>
  /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z'

// Convierte un string de fecha UTC a un objeto Date en zona Guatemala
const toGT = (s: string): Date => new Date(asUTC(s))

// Formatea una fecha en zona Guatemala independientemente del navegador
const intlDate = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-GT', { timeZone: TZ, ...opts }).format(d)

export const formatCurrency = (value: number): string => {
  const n = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `Q ${n}`
}

export const formatNumber = (value: number, decimals = 0): string =>
  new Intl.NumberFormat('es-GT', { maximumFractionDigits: decimals }).format(value)

export const formatDate = (dateStr: string): string => {
  try {
    const d = toGT(dateStr)
    return isFinite(d.getTime())
      ? intlDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' })
      : dateStr
  } catch { return dateStr }
}

export const formatDateTime = (dateStr: string): string => {
  try {
    const d = toGT(dateStr)
    return isFinite(d.getTime())
      ? intlDate(d, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      : dateStr
  } catch { return dateStr }
}

export const formatDateShort = (dateStr: string): string => {
  try {
    const d = toGT(dateStr)
    return isFinite(d.getTime())
      ? intlDate(d, { day: '2-digit', month: 'short' })
      : dateStr
  } catch { return dateStr }
}

// Para inputs de tipo date, necesitamos la fecha en Guatemala como YYYY-MM-DD
export const today = (): string => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return parts  // en-CA produce YYYY-MM-DD
}

// Igual que today() pero para cualquier fecha
export const toDateInput = (dateStr: string): string => {
  try {
    const d = toGT(dateStr)
    return isFinite(d.getTime())
      ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
      : dateStr
  } catch { return dateStr }
}

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

// Mantener compatibilidad con código que usa parseISO directamente
export { parseISO, isValid, format, es }
