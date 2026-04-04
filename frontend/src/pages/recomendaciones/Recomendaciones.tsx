import { useEffect, useState } from 'react'
import { ShoppingBag, RefreshCw, TrendingUp } from 'lucide-react'
import { getRecomendacionesCompra } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import type { RecomendacionCompra } from '../../types'

const prioridadConfig = {
  alta:  { label: 'Alta',  variant: 'danger' as const,   desc: 'Compra urgente' },
  media: { label: 'Media', variant: 'warning' as const,  desc: 'Comprar pronto' },
  ok:    { label: 'OK',    variant: 'success' as const,  desc: 'Stock suficiente' },
}

export default function Recomendaciones() {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionCompra[]>([])
  const [dias, setDias] = useState(7)
  const [diasProyectados, setDiasProyectados] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (d = dias) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getRecomendacionesCompra(d)
      setRecomendaciones(res.data.recomendaciones)
      setDiasProyectados(res.data.dias_proyectados)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Error al cargar recomendaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activas = recomendaciones.filter((r) => r.prioridad !== 'ok')
  const alta = recomendaciones.filter((r) => r.prioridad === 'alta')
  const media = recomendaciones.filter((r) => r.prioridad === 'media')

  return (
    <div>
      <PageHeader
        title="Recomendaciones de compra"
        description={`Basadas en predicción ML para los próximos ${diasProyectados} días`}
        action={
          <div className="flex items-center gap-2">
            <select
              value={dias}
              onChange={(e) => { const d = Number(e.target.value); setDias(d); load(d) }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white"
              disabled={loading}
            >
              {[3, 7, 14, 21, 30].map((d) => (
                <option key={d} value={d}>{d} días</option>
              ))}
            </select>
            <button onClick={() => load()} className="btn-secondary" disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : error ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-yellow-700 font-medium">{error}</p>
          {error.includes('Modelo') && (
            <p className="text-sm text-yellow-600 mt-1">Ve a Predicciones y entrena el modelo primero.</p>
          )}
        </div>
      ) : activas.length === 0 ? (
        <EmptyState
          message="Sin recomendaciones de compra"
          description="El stock cubre la demanda predicha para el período seleccionado."
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border bg-red-50 border-red-200 text-red-700 p-4 text-center">
              <p className="text-2xl font-bold">{alta.length}</p>
              <p className="text-sm font-medium">Prioridad alta</p>
            </div>
            <div className="rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-700 p-4 text-center">
              <p className="text-2xl font-bold">{media.length}</p>
              <p className="text-sm font-medium">Prioridad media</p>
            </div>
            <div className="rounded-xl border bg-gray-50 border-gray-200 text-gray-600 p-4 text-center">
              <p className="text-2xl font-bold">{recomendaciones.filter(r => r.prioridad === 'ok').length}</p>
              <p className="text-sm font-medium">Stock OK</p>
            </div>
          </div>

          {/* Nota ML */}
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
            <TrendingUp size={14} className="text-blue-400 flex-shrink-0" />
            Las cantidades se calculan a partir de la predicción de ventas del modelo ML × recetas × stock disponible.
          </div>

          {/* Lista */}
          <div className="card divide-y divide-gray-100">
            {recomendaciones.map((r) => {
              const cfg = prioridadConfig[r.prioridad]
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
                      <span>Necesario: <span className="font-medium text-gray-700">{r.cantidad_necesaria.toFixed(2)} {r.unidad_medida}</span></span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">{r.cantidad_a_comprar.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{r.unidad_medida} a comprar</p>
                    {r.costo_estimado > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">Q{r.costo_estimado.toFixed(2)}</p>
                    )}
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
