import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { getRiesgoMerma } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import type { ItemRiesgoMerma } from '../../types'

const riesgoConfig = {
  alto:       { label: 'Riesgo alto',   variant: 'danger' as const,  bg: 'bg-red-50 border-red-200',      barColor: 'bg-red-500',    icon: '🔴', sub: 'Usar o donar pronto' },
  medio:      { label: 'Riesgo medio',  variant: 'warning' as const, bg: 'bg-yellow-50 border-yellow-200', barColor: 'bg-yellow-400', icon: '🟡', sub: 'Monitorear consumo' },
  bajo_stock: { label: 'Stock bajo',    variant: 'info' as const,    bg: 'bg-blue-50 border-blue-200',    barColor: 'bg-blue-400',   icon: '🔵', sub: 'Reabastecer pronto' },
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
      setError(err?.response?.data?.detail ?? 'Error al cargar riesgo de merma')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const alto = items.filter((i) => i.riesgo === 'alto')
  const medio = items.filter((i) => i.riesgo === 'medio')
  const bajoStock = items.filter((i) => i.riesgo === 'bajo_stock')

  return (
    <div>
      <PageHeader
        title="Control de merma"
        description="Ingredientes perecederos con riesgo de vencimiento o stock bajo"
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
          description="Todos los ingredientes están dentro de sus parámetros normales."
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { riesgo: 'alto', count: alto.length, label: 'Riesgo alto', bg: 'bg-red-50 border-red-300', text: 'text-red-700', sub: 'Exceso vs vida útil' },
              { riesgo: 'medio', count: medio.length, label: 'Riesgo medio', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', sub: 'Vigilar consumo' },
              { riesgo: 'bajo_stock', count: bajoStock.length, label: 'Stock bajo', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', sub: 'Reabastecer' },
            ].map(({ riesgo, count, label, bg, text, sub }) => (
              <div key={riesgo} className={`rounded-xl border p-4 ${bg}`}>
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
          {(['alto', 'medio', 'bajo_stock'] as const).map((riesgo) => {
            const list = riesgo === 'alto' ? alto : riesgo === 'medio' ? medio : bajoStock
            if (list.length === 0) return null
            const cfg = riesgoConfig[riesgo]
            return (
              <div key={riesgo} className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-inherit flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  <h3 className="font-semibold text-gray-900">{cfg.label}</h3>
                  <span className="ml-auto text-sm text-gray-500">{list.length} ingrediente{list.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-white/50">
                  {list.map((item) => (
                    <div key={item.ingrediente_id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm">{item.nombre}</p>
                          <Badge variant={cfg.variant}>{item.riesgo === 'bajo_stock' ? 'Stock bajo' : `${item.vida_util_dias}d vida útil`}</Badge>
                        </div>
                        <div className="flex gap-6 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>Stock: <span className="font-medium text-gray-700">{item.stock_actual} {item.unidad_medida}</span></span>
                          <span>Consumo/día: <span className="font-medium text-gray-700">{item.consumo_diario_prom.toFixed(2)} {item.unidad_medida}</span></span>
                          <span>
                            Días hasta agotar:{' '}
                            <span className="font-medium text-gray-700">
                              {item.dias_hasta_agotar >= 999 ? '—' : item.dias_hasta_agotar}
                            </span>
                          </span>
                          {item.exceso_estimado > 0 && (
                            <span className="text-red-600 font-medium">
                              Exceso estimado: {item.exceso_estimado.toFixed(2)} {item.unidad_medida}
                            </span>
                          )}
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
