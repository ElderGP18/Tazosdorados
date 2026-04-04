import { useEffect, useState } from 'react'
import { ShoppingBag, RefreshCw } from 'lucide-react'
import { getStock } from '../../api/stock'
import { getIngredientes } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import type { Recomendacion, Stock, Ingrediente } from '../../types'

function calcularRecomendaciones(stock: Stock[], ingredientes: Ingrediente[]): Recomendacion[] {
  return stock
    .filter((s) => s.cantidad_disponible < s.cantidad_minima * 1.5)
    .map((s) => {
      const ing = ingredientes.find((i) => i.id === s.ingrediente_id)
      const porcentaje = s.cantidad_minima > 0 ? s.cantidad_disponible / s.cantidad_minima : 1
      const prioridad: Recomendacion['prioridad'] =
        porcentaje <= 0.3 ? 'alta' : porcentaje <= 0.7 ? 'media' : 'baja'
      const cantidad_sugerida = Math.ceil(s.cantidad_minima * 3 - s.cantidad_disponible)
      return {
        ingrediente_id: s.ingrediente_id,
        nombre: ing?.nombre ?? `#${s.ingrediente_id}`,
        unidad_medida: ing?.unidad_medida ?? '',
        stock_actual: Number(s.cantidad_disponible),
        stock_minimo: Number(s.cantidad_minima),
        cantidad_sugerida,
        prioridad,
      }
    })
    .sort((a, b) => {
      const order = { alta: 0, media: 1, baja: 2 }
      return order[a.prioridad] - order[b.prioridad]
    })
}

const prioridadConfig = {
  alta:  { label: 'Alta',  variant: 'danger' as const,   desc: 'Compra urgente' },
  media: { label: 'Media', variant: 'warning' as const,  desc: 'Comprar pronto' },
  baja:  { label: 'Baja',  variant: 'info' as const,     desc: 'Revisar stock' },
}

export default function Recomendaciones() {
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([getStock(), getIngredientes()])
      setRecomendaciones(calcularRecomendaciones(s.data, i.data))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const alta = recomendaciones.filter((r) => r.prioridad === 'alta')
  const media = recomendaciones.filter((r) => r.prioridad === 'media')
  const baja = recomendaciones.filter((r) => r.prioridad === 'baja')

  return (
    <div>
      <PageHeader
        title="Recomendaciones de compra"
        description="Basadas en niveles de stock actuales"
        action={
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : recomendaciones.length === 0 ? (
        <EmptyState
          message="Sin recomendaciones"
          description="El stock de todos los ingredientes está en niveles adecuados."
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            {([['alta', alta.length, 'bg-red-50 border-red-200 text-red-700'], ['media', media.length, 'bg-yellow-50 border-yellow-200 text-yellow-700'], ['baja', baja.length, 'bg-blue-50 border-blue-200 text-blue-700']] as const).map(([p, count, cls]) => (
              <div key={p} className={`rounded-xl border p-4 text-center ${cls}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm font-medium capitalize">Prioridad {p}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          <div className="card divide-y divide-gray-100">
            {recomendaciones.map((r) => {
              const cfg = prioridadConfig[r.prioridad]
              const porcentaje = r.stock_minimo > 0 ? Math.round((r.stock_actual / r.stock_minimo) * 100) : 100
              return (
                <div key={r.ingrediente_id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{r.nombre}</p>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <span>Stock: <span className="font-medium text-gray-700">{r.stock_actual} {r.unidad_medida}</span></span>
                      <span>Mínimo: <span className="font-medium text-gray-700">{r.stock_minimo} {r.unidad_medida}</span></span>
                      <span className="text-xs text-gray-400">({porcentaje}% del mínimo)</span>
                    </div>
                    <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${r.prioridad === 'alta' ? 'bg-red-500' : r.prioridad === 'media' ? 'bg-yellow-400' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">{r.cantidad_sugerida}</p>
                    <p className="text-xs text-gray-400">{r.unidad_medida} sugeridos</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cfg.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
