import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, ListChecks, CheckCircle2, Printer, ShoppingCart } from 'lucide-react'
import { getRecomendacionesCompra } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import { formatCurrency } from '../../utils/format'
import type { RecomendacionCompra, ResumenRecomendaciones } from '../../types'

const prioridadConfig = {
  alta:  { label: 'Urgente',   badge: 'bg-red-500 text-white',       stripe: 'bg-red-500',    row: 'bg-red-50/40' },
  media: { label: 'Comprar',   badge: 'bg-yellow-400 text-yellow-900', stripe: 'bg-yellow-400', row: '' },
  ok:    { label: 'Stock OK',  badge: 'bg-green-500 text-white',      stripe: 'bg-green-500',  row: '' },
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

  const handlePrint = () => window.print()

  return (
    <div>
      <PageHeader
        title="Qué comprar"
        description={`Lista de ingredientes a comprar para los próximos ${diasProyectados} días`}
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

          {/* ── HERO: total a gastar ────────────────────────────────── */}
          {resumen && (
            <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-orange-500 text-white p-6 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/80 font-semibold">Total a gastar</p>
                  <p className="text-5xl font-bold leading-none mt-1">{formatCurrency(resumen.total_costo_compra)}</p>
                  <p className="text-sm text-white/90 mt-2">
                    {resumen.items_a_comprar} ingrediente{resumen.items_a_comprar !== 1 ? 's' : ''} · próximos {diasProyectados} días
                  </p>
                </div>

                <div className="flex gap-3">
                  {resumen.items_alta > 0 && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                      <p className="text-3xl font-bold">{resumen.items_alta}</p>
                      <p className="text-xs text-white/90 font-medium">Urgentes</p>
                    </div>
                  )}
                  {resumen.items_media > 0 && (
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[100px]">
                      <p className="text-3xl font-bold">{resumen.items_media}</p>
                      <p className="text-xs text-white/90 font-medium">A reponer</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aviso merma si aplica */}
          {resumen && resumen.total_costo_merma > 0 && (
            <div className="flex items-start gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p>
                <b>{formatCurrency(resumen.total_costo_merma)}</b> del stock actual vencerá antes de usarse — ya descontado del cálculo de compras.
                Revísalo en <b>Control de merma</b>.
              </p>
            </div>
          )}

          {/* Switch de vistas */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${vista === 'lista' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <ShoppingCart size={14} /> Lista
              </button>
              <button
                onClick={() => setVista('compra')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${vista === 'compra' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                <ListChecks size={14} /> Marcar comprados
              </button>
            </div>
            <button onClick={handlePrint} className="btn-secondary print:hidden">
              <Printer size={14} /> Imprimir
            </button>
          </div>

          {/* ── Vista LISTA (limpia, solo lo que hay que comprar) ──── */}
          {vista === 'lista' && (
            <div className="card overflow-hidden">
              <div className="divide-y divide-gray-100">
                {toCompras.map((r) => {
                  const cfg = prioridadConfig[r.prioridad]
                  const hasMerma = r.merma_estimada > 0
                  return (
                    <div key={r.ingrediente_id} className={`relative flex items-center gap-4 px-5 py-4 ${cfg.row}`}>
                      {/* Línea vertical de color (indicador de prioridad) */}
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.stripe}`} />

                      {/* Nombre + badge */}
                      <div className="flex-1 min-w-0 pl-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-base">{r.nombre}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {hasMerma && (
                          <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                            <AlertTriangle size={11} />
                            {r.merma_estimada.toFixed(2)} {r.unidad_medida} vencerá antes de usarse
                          </p>
                        )}
                      </div>

                      {/* Cantidad grande + costo */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-3xl font-bold text-gray-900 leading-none">
                          {r.cantidad_a_comprar.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{r.unidad_medida}</p>
                        {r.costo_estimado > 0 && (
                          <p className="text-base font-bold text-brand-600 mt-1.5">
                            {formatCurrency(r.costo_estimado)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer con total */}
              <div className="bg-gray-50 border-t-2 border-gray-200 px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {toCompras.length} ingrediente{toCompras.length !== 1 ? 's' : ''}
                </span>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(resumen?.total_costo_compra ?? 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Vista MARCAR COMPRADOS (checkboxes, imprimible) ────── */}
          {vista === 'compra' && (
            <div className="card print:shadow-none print:border-0">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900">Lista de compra</h3>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-brand-600">{formatCurrency(resumen?.total_costo_compra ?? 0)}</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {toCompras.map((r) => {
                  const cfg = prioridadConfig[r.prioridad]
                  const isChecked = !!checked[r.ingrediente_id]
                  return (
                    <label
                      key={r.ingrediente_id}
                      className={`relative flex items-center gap-3 px-5 py-4 cursor-pointer transition-opacity ${isChecked ? 'opacity-40' : ''}`}
                    >
                      <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.stripe}`} />

                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => setChecked((c) => ({ ...c, [r.ingrediente_id]: !c[r.ingrediente_id] }))}
                        className="w-6 h-6 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0 print:hidden"
                      />
                      <span className="hidden print:inline-block w-6 h-6 border-2 border-gray-400 rounded flex-shrink-0" />

                      <div className={`flex-1 min-w-0 pl-1 ${isChecked ? 'line-through' : ''}`}>
                        <p className="font-bold text-gray-900">{r.nombre}</p>
                        {r.prioridad === 'alta' && (
                          <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mt-0.5">Urgente</p>
                        )}
                      </div>

                      <div className={`text-right flex-shrink-0 ${isChecked ? 'line-through' : ''}`}>
                        <p className="text-xl font-bold text-gray-900">
                          {r.cantidad_a_comprar.toFixed(2)} <span className="text-sm font-normal text-gray-400">{r.unidad_medida}</span>
                        </p>
                        <p className="text-sm font-bold text-brand-600">{formatCurrency(r.costo_estimado)}</p>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="bg-gray-50 border-t-2 border-gray-200 px-5 py-4 flex items-center justify-between print:bg-white">
                <div className="flex items-center gap-2 text-sm text-gray-600 print:hidden">
                  <CheckCircle2 size={14} />
                  {Object.values(checked).filter(Boolean).length} de {toCompras.length} marcados
                </div>
                <div className="text-right ml-auto">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(resumen?.total_costo_compra ?? 0)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
