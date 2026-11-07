import { useEffect, useState } from 'react'
import { ShoppingBag, RefreshCw, TrendingUp, AlertTriangle, DollarSign, ListChecks, CheckCircle2, Printer } from 'lucide-react'
import { getRecomendacionesCompra } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import { formatCurrency } from '../../utils/format'
import type { RecomendacionCompra, ResumenRecomendaciones } from '../../types'

const prioridadConfig = {
  alta:  { label: 'Urgente',    variant: 'danger'  as const, badge: 'bg-red-100 text-red-700',       border: 'border-red-200 bg-red-50' },
  media: { label: 'Comprar',    variant: 'warning' as const, badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200 bg-yellow-50' },
  ok:    { label: 'Stock OK',   variant: 'success' as const, badge: 'bg-green-100 text-green-700',   border: 'border-green-200 bg-green-50' },
}

export default function Recomendaciones() {
  const [recomendaciones, setRecomendaciones] = useState<RecomendacionCompra[]>([])
  const [resumen, setResumen] = useState<ResumenRecomendaciones | null>(null)
  const [dias, setDias] = useState(7)
  const [diasProyectados, setDiasProyectados] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [vista, setVista] = useState<'lista' | 'compra'>('lista')

  const load = async (d = dias) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getRecomendacionesCompra(d)
      setRecomendaciones(res.data.recomendaciones)
      setResumen(res.data.resumen)
      setDiasProyectados(res.data.dias_proyectados)
      setChecked({})
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Error al cargar recomendaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toCompras = recomendaciones.filter((r) => r.cantidad_a_comprar > 0)
  const alta = recomendaciones.filter((r) => r.prioridad === 'alta')
  const media = recomendaciones.filter((r) => r.prioridad === 'media')

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      <PageHeader
        title="Recomendaciones de compra"
        description={`Qué comprar para los próximos ${diasProyectados} días — basado en predicción ML × recetas × stock útil (sin merma)`}
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
      ) : toCompras.length === 0 ? (
        <EmptyState
          message="No hay que comprar nada"
          description={`El stock actual cubre la demanda predicha para los próximos ${diasProyectados} días.`}
        />
      ) : (
        <div className="space-y-5">

          {/* ── RESUMEN GRANDE (qué comprar y cuánto gastar) ────────── */}
          {resumen && (
            <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-orange-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={18} className="text-brand-600" />
                <h3 className="font-bold text-gray-900">
                  Comprar {resumen.items_a_comprar} ingrediente{resumen.items_a_comprar !== 1 ? 's' : ''} — Total estimado {formatCurrency(resumen.total_costo_compra)}
                </h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border-2 border-brand-300 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign size={10} /> Total a gastar
                  </p>
                  <p className="text-2xl font-bold text-brand-700 mt-0.5">{formatCurrency(resumen.total_costo_compra)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Para {diasProyectados} día{diasProyectados !== 1 ? 's' : ''} de operación
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-red-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Urgentes</p>
                  <p className="text-2xl font-bold text-red-700 mt-0.5">{resumen.items_alta}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Bajo mínimo — hoy</p>
                </div>
                <div className="bg-white rounded-lg border border-yellow-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">A reponer</p>
                  <p className="text-2xl font-bold text-yellow-700 mt-0.5">{resumen.items_media}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Esta semana</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Costo merma</p>
                  <p className={`text-2xl font-bold mt-0.5 ${resumen.total_costo_merma > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(resumen.total_costo_merma)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ya descontada del stock</p>
                </div>
              </div>
            </div>
          )}

          {/* Explicación de la fórmula */}
          <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
            <TrendingUp size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              Fórmula: <b>a comprar</b> = necesidad ML para {diasProyectados} días − stock útil (sin merma) + stock mínimo de seguridad.
              La merma se resta antes de calcular, así no compramos encima de lo que ya se va a echar a perder.
            </p>
          </div>

          {/* Switch de vistas */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${vista === 'lista' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <ShoppingBag size={14} /> Detalle
              </button>
              <button
                onClick={() => setVista('compra')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${vista === 'compra' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <ListChecks size={14} /> Lista de compra
              </button>
            </div>
            {vista === 'compra' && (
              <button onClick={handlePrint} className="btn-secondary print:hidden">
                <Printer size={14} /> Imprimir
              </button>
            )}
          </div>

          {/* ── Vista Detalle ──────────────────────────────────────── */}
          {vista === 'lista' && (
            <div className="card divide-y divide-gray-100">
              {recomendaciones.map((r) => {
                const cfg = prioridadConfig[r.prioridad]
                const hasMerma = r.merma_estimada > 0
                return (
                  <div key={r.ingrediente_id} className={`px-5 py-4 ${r.prioridad === 'alta' ? 'bg-red-50/30' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={18} className="text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900">{r.nombre}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                        </div>

                        {/* Fórmula visual */}
                        <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                          <div className="text-center bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                            <p className="text-gray-500 text-[10px]">Necesario {diasProyectados}d</p>
                            <p className="font-semibold text-gray-700">{r.cantidad_necesaria.toFixed(2)}</p>
                          </div>
                          <div className="text-center bg-green-50 border border-green-200 rounded px-2 py-1.5">
                            <p className="text-green-700 text-[10px]">− Stock útil</p>
                            <p className="font-semibold text-green-700">{r.stock_utilizable.toFixed(2)}</p>
                          </div>
                          <div className={`text-center rounded px-2 py-1.5 ${r.cantidad_a_comprar > 0 ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50 border border-gray-200'}`}>
                            <p className={`text-[10px] ${r.cantidad_a_comprar > 0 ? 'text-brand-700' : 'text-gray-500'}`}>= A comprar</p>
                            <p className={`font-bold ${r.cantidad_a_comprar > 0 ? 'text-brand-700' : 'text-gray-600'}`}>{r.cantidad_a_comprar.toFixed(2)}</p>
                          </div>
                        </div>
                        {hasMerma && (
                          <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={11} />
                            Dentro del stock hay {r.merma_estimada.toFixed(2)} {r.unidad_medida} que vencerá antes de usarse ({formatCurrency(r.costo_merma)} perdidos)
                          </p>
                        )}
                      </div>

                      {/* Monto grande */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-gray-900 leading-none">
                          {r.cantidad_a_comprar.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">{r.unidad_medida}</p>
                        {r.costo_estimado > 0 && (
                          <p className="text-sm font-bold text-green-700 mt-1">{formatCurrency(r.costo_estimado)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Vista Lista de compra (checkbox + imprimible) ──────── */}
          {vista === 'compra' && (
            <div className="card p-5 print:shadow-none print:border-0">
              <div className="flex items-center justify-between mb-4 print:mb-6">
                <h3 className="font-bold text-lg text-gray-900">Lista de compra</h3>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total estimado</p>
                  <p className="text-2xl font-bold text-brand-700">{formatCurrency(resumen?.total_costo_compra ?? 0)}</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {toCompras.map((r) => {
                  const isChecked = !!checked[r.ingrediente_id]
                  return (
                    <label
                      key={r.ingrediente_id}
                      className={`flex items-center gap-3 py-3 cursor-pointer ${isChecked ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setChecked((c) => ({ ...c, [r.ingrediente_id]: !c[r.ingrediente_id] }))}
                        className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0 print:hidden"
                      />
                      <span className="hidden print:inline-block w-5 h-5 border-2 border-gray-400 rounded flex-shrink-0" />
                      <div className={`flex-1 min-w-0 ${isChecked ? 'line-through' : ''}`}>
                        <p className="font-semibold text-gray-900">{r.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {r.prioridad === 'alta' && <span className="text-red-600 font-medium">URGENTE · </span>}
                          Costo unit: {formatCurrency(r.costo_unitario)}/{r.unidad_medida}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900">{r.cantidad_a_comprar.toFixed(2)} {r.unidad_medida}</p>
                        <p className="text-xs font-semibold text-green-700">{formatCurrency(r.costo_estimado)}</p>
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Footer imprimible */}
              <div className="mt-6 pt-4 border-t-2 border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 size={14} />
                  {Object.values(checked).filter(Boolean).length} de {toCompras.length} comprados
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(resumen?.total_costo_compra ?? 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mini-leyenda */}
          {(alta.length > 0 || media.length > 0) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <Badge variant="danger">{alta.length} urgente{alta.length !== 1 ? 's' : ''}</Badge>
              <Badge variant="warning">{media.length} a reponer</Badge>
              <span>— ordenados por prioridad y costo</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
