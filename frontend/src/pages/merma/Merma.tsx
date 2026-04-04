import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Clock, CalendarX } from 'lucide-react'
import { getRiesgoMerma } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import { formatDate } from '../../utils/format'
import type { ItemRiesgoMerma } from '../../types'

const riesgoConfig = {
  vencido: {
    label: 'Vencido',
    variant: 'danger' as const,
    bg: 'bg-red-50 border-red-300',
    barColor: 'bg-red-600',
    text: 'text-red-700',
    icon: '🔴',
    sub: 'Retirar del stock',
  },
  alto: {
    label: 'Vence pronto',
    variant: 'danger' as const,
    bg: 'bg-orange-50 border-orange-200',
    barColor: 'bg-orange-500',
    text: 'text-orange-700',
    icon: '🟠',
    sub: 'Usar hoy o mañana',
  },
  medio: {
    label: 'Atencion',
    variant: 'warning' as const,
    bg: 'bg-yellow-50 border-yellow-200',
    barColor: 'bg-yellow-400',
    text: 'text-yellow-700',
    icon: '🟡',
    sub: 'Monitorear',
  },
}

export default function Merma() {
  const [items, setItems] = useState<ItemRiesgoMerma[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getRiesgoMerma()
      setItems(res.data.ingredientes_en_riesgo)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Error al cargar control de merma')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const vencidos = items.filter((i) => i.riesgo === 'vencido')
  const alto = items.filter((i) => i.riesgo === 'alto')
  const medio = items.filter((i) => i.riesgo === 'medio')

  return (
    <div>
      <PageHeader
        title="Control de merma"
        description="Ingredientes perecederos según tiempo en stock y vida útil"
        action={
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          message="Sin riesgo de merma"
          description="Todos los ingredientes están dentro de su vida útil normal."
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'vencido', count: vencidos.length, label: 'Vencidos', bg: 'bg-red-50 border-red-300', text: 'text-red-700', sub: 'Retirar del stock' },
              { key: 'alto',    count: alto.length,     label: 'Vencen pronto', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', sub: 'Usar hoy o mañana' },
              { key: 'medio',   count: medio.length,    label: 'En vigilancia', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', sub: 'Monitorear' },
            ].map(({ key, count, label, bg, text, sub }) => (
              <div key={key} className={`rounded-xl border p-4 ${bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-3xl font-bold ${text}`}>{count}</p>
                    <p className={`text-sm font-semibold ${text}`}>{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                  <AlertTriangle size={28} className={`${text} opacity-40`} />
                </div>
              </div>
            ))}
          </div>

          {/* Secciones por nivel */}
          {(['vencido', 'alto', 'medio'] as const).map((riesgo) => {
            const list = riesgo === 'vencido' ? vencidos : riesgo === 'alto' ? alto : medio
            if (list.length === 0) return null
            const cfg = riesgoConfig[riesgo]
            return (
              <div key={riesgo} className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-inherit flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  <h3 className={`font-semibold ${cfg.text}`}>{cfg.label}</h3>
                  <span className="ml-auto text-sm text-gray-500">
                    {list.length} ingrediente{list.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-white/60">
                  {list.map((item) => (
                    <div key={item.ingrediente_id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Nombre + badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">{item.nombre}</p>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </div>

                          {/* Barra de vida útil */}
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> Vida útil: {item.vida_util_dias} días
                              </span>
                              <span className={item.riesgo === 'vencido' ? 'text-red-600 font-medium' : ''}>
                                {item.riesgo === 'vencido'
                                  ? `Venció hace ${item.dias_en_stock - item.vida_util_dias} día${item.dias_en_stock - item.vida_util_dias !== 1 ? 's' : ''}`
                                  : `${item.dias_restantes} día${item.dias_restantes !== 1 ? 's' : ''} restante${item.dias_restantes !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/70 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${cfg.barColor}`}
                                style={{ width: `${Math.min(item.porcentaje_restante, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Detalle */}
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <CalendarX size={11} />
                              Ingresó: <span className="font-medium text-gray-700">{formatDate(item.fecha_ingreso)}</span>
                            </span>
                            <span>
                              En stock: <span className="font-medium text-gray-700">{item.dias_en_stock} día{item.dias_en_stock !== 1 ? 's' : ''}</span>
                            </span>
                            <span>
                              Cantidad: <span className="font-medium text-gray-700">{item.stock_actual} {item.unidad_medida}</span>
                            </span>
                          </div>
                        </div>

                        {/* Indicador circular de % */}
                        <div className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center text-sm font-bold
                          ${item.riesgo === 'vencido'
                            ? 'border-red-400 text-red-600 bg-red-50'
                            : item.riesgo === 'alto'
                            ? 'border-orange-400 text-orange-600 bg-orange-50'
                            : 'border-yellow-400 text-yellow-600 bg-yellow-50'}`}
                        >
                          {item.riesgo === 'vencido' ? '!' : `${item.porcentaje_restante}%`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
