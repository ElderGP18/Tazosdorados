import { useEffect, useState } from 'react'
import { RefreshCw, Clock, CalendarX, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Info } from 'lucide-react'
import { getRiesgoMerma } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { formatDate, formatCurrency } from '../../utils/format'
import type { ItemMermaFrescura, LoteMerma, TotalesMerma } from '../../types'

const estadoConfig = {
  vencido: {
    label: 'Vencido',
    variant: 'danger' as const,
    bg: 'bg-red-50/40',
    bar: 'bg-red-600',
    text: 'text-red-700',
    border: 'border-red-200',
    ring: 'border-red-400 text-red-600 bg-red-50',
    loteBg: 'bg-red-50 border-red-200',
    loteText: 'text-red-700',
  },
  alto: {
    label: 'Vence pronto',
    variant: 'danger' as const,
    bg: 'bg-orange-50/20',
    bar: 'bg-orange-500',
    text: 'text-orange-700',
    border: 'border-orange-200',
    ring: 'border-orange-400 text-orange-600 bg-orange-50',
    loteBg: 'bg-orange-50 border-orange-200',
    loteText: 'text-orange-700',
  },
  medio: {
    label: 'Vigilar',
    variant: 'warning' as const,
    bg: '',
    bar: 'bg-yellow-400',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    ring: 'border-yellow-400 text-yellow-600 bg-yellow-50',
    loteBg: 'bg-yellow-50 border-yellow-200',
    loteText: 'text-yellow-700',
  },
  ok: {
    label: 'Fresco',
    variant: 'success' as const,
    bg: '',
    bar: 'bg-green-500',
    text: 'text-green-700',
    border: 'border-green-200',
    ring: 'border-green-400 text-green-600 bg-green-50',
    loteBg: 'bg-green-50 border-green-200',
    loteText: 'text-green-700',
  },
}

function LoteRow({ lote, unidad }: { lote: LoteMerma; unidad: string }) {
  const cfg = estadoConfig[lote.estado]
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${cfg.loteBg}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-700">{lote.cantidad.toFixed(2)} {unidad}</span>
          <Badge variant={cfg.variant} >{cfg.label}</Badge>
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <CalendarX size={10} /> {formatDate(lote.fecha_ingreso)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${cfg.bar}`}
            style={{ width: `${Math.min(lote.porcentaje_restante, 100)}%` }}
          />
        </div>
        <div className={`text-xs mt-1 ${cfg.loteText}`}>
          {lote.estado === 'vencido'
            ? `Venció hace ${Math.max(1, lote.dias_en_stock - lote.dias_restantes)} día(s)`
            : `${lote.dias_restantes} día${lote.dias_restantes !== 1 ? 's' : ''} restante${lote.dias_restantes !== 1 ? 's' : ''} · ${lote.dias_en_stock} días en stock`}
        </div>
      </div>
    </div>
  )
}

function IngredienteRow({ item }: { item: ItemMermaFrescura }) {
  const [expanded, setExpanded] = useState(item.estado_general !== 'ok')
  const cfg = estadoConfig[item.estado_general]
  const worstPct = item.lotes.length > 0 ? item.lotes[0].porcentaje_restante : 0
  const tieneMerma = item.stock_merma > 0

  return (
    <div className={`px-5 py-4 ${cfg.bg}`}>
      <div className="flex items-start gap-4">
        {/* Indicador circular */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-bold ${cfg.ring}`}>
          {item.estado_general === 'vencido' ? '!' : item.estado_general === 'ok' ? <CheckCircle size={18} /> : `${worstPct}%`}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <p className="font-semibold text-gray-900">{item.nombre}</p>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            {item.lotes.length > 1 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium ml-1"
              >
                {item.lotes.length} lotes {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {/* Métricas clave: stock bueno vs merma */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2.5">
            <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Stock total</p>
              <p className="text-sm font-semibold text-gray-900">
                {item.stock_actual.toFixed(2)} <span className="text-xs text-gray-400 font-normal">{item.unidad_medida}</span>
              </p>
            </div>
            <div className={`rounded-md border px-2 py-1.5 ${tieneMerma ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Stock útil</p>
              <p className={`text-sm font-semibold ${tieneMerma ? 'text-green-700' : 'text-gray-900'}`}>
                {item.stock_bueno.toFixed(2)} <span className="text-xs text-gray-400 font-normal">{item.unidad_medida}</span>
              </p>
            </div>
            <div className={`rounded-md border px-2 py-1.5 col-span-2 sm:col-span-1 ${tieneMerma ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">En merma</p>
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${tieneMerma ? 'text-red-700' : 'text-gray-400'}`}>
                  {item.stock_merma.toFixed(2)} <span className="text-xs font-normal">{item.unidad_medida}</span>
                </p>
                {tieneMerma && (
                  <p className="text-xs font-semibold text-red-700">{formatCurrency(item.costo_merma)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Barra general (basada en el lote más viejo) */}
          <div className="mb-1.5">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1">
                <Clock size={10} /> Vida útil: {item.vida_util_dias} días
              </span>
              <span className={item.estado_general === 'vencido' ? 'text-red-600 font-semibold' : item.estado_general === 'ok' ? 'text-green-600' : 'font-medium'}>
                {item.lotes.length > 0
                  ? item.estado_general === 'vencido'
                    ? `Lote más viejo: ${item.lotes[0].dias_en_stock} días en stock`
                    : `Lote más viejo: ${item.lotes[0].dias_restantes} día${item.lotes[0].dias_restantes !== 1 ? 's' : ''} restante${item.lotes[0].dias_restantes !== 1 ? 's' : ''}`
                  : ''}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${cfg.bar}`}
                style={{ width: `${Math.min(worstPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Desglose de lotes */}
          {item.lotes.length === 1 ? (
            <div className="flex gap-4 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <CalendarX size={10} />
                Ingresó: <span className="text-gray-600 font-medium">{formatDate(item.lotes[0].fecha_ingreso)}</span>
              </span>
              <span>Días en stock: <span className="text-gray-600 font-medium">{item.lotes[0].dias_en_stock}</span></span>
            </div>
          ) : expanded ? (
            <div className="mt-2 space-y-1.5">
              {item.lotes.map((lote, i) => (
                <LoteRow key={i} lote={lote} unidad={item.unidad_medida} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              {item.lotes.length} lotes — el más viejo ingresó el {formatDate(item.lotes[0].fecha_ingreso)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Merma() {
  const [items, setItems] = useState<ItemMermaFrescura[]>([])
  const [totales, setTotales] = useState<TotalesMerma | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'vencido' | 'alto' | 'medio' | 'ok'>('todos')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getRiesgoMerma()
      setItems(res.data.ingredientes)
      setTotales(res.data.totales)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err?.response?.data?.detail ?? 'Error al cargar control de merma')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const vencidos = items.filter((i) => i.estado_general === 'vencido')
  const alto     = items.filter((i) => i.estado_general === 'alto')
  const medio    = items.filter((i) => i.estado_general === 'medio')
  const ok       = items.filter((i) => i.estado_general === 'ok')

  const lista = filtro === 'todos' ? items
    : filtro === 'vencido' ? vencidos
    : filtro === 'alto' ? alto
    : filtro === 'medio' ? medio
    : ok

  return (
    <div>
      <PageHeader
        title="Control de merma"
        description="Cuánto producto se está echando a perder y cuánto cuesta — lotes evaluados FIFO: las salidas rebajan primero la merma"
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
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center">
          <p className="text-gray-500 font-medium">Sin ingredientes perecederos registrados</p>
          <p className="text-sm text-gray-400 mt-1">Registra entradas de stock para que el sistema pueda calcular la frescura.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── TOTALES (lo más importante: cuánto hay de merma) ────── */}
          {totales && (
            <div className={`rounded-2xl border-2 p-5 ${totales.costo_merma > 0 ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className={totales.costo_merma > 0 ? 'text-red-600' : 'text-green-600'} />
                <h3 className="font-bold text-gray-900">
                  {totales.costo_merma > 0
                    ? `Tienes ${formatCurrency(totales.costo_merma)} en merma`
                    : 'Sin merma — todo el stock está utilizable'}
                </h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-red-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Vencido</p>
                  <p className="text-2xl font-bold text-red-700 mt-0.5">{totales.cantidad_vencida.toFixed(2)}</p>
                  <p className="text-xs text-red-600 font-semibold">{formatCurrency(totales.costo_vencida)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Hay que descartar</p>
                </div>
                <div className="bg-white rounded-lg border border-orange-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Pronto a vencer</p>
                  <p className="text-2xl font-bold text-orange-700 mt-0.5">{totales.cantidad_pronta_vencer.toFixed(2)}</p>
                  <p className="text-xs text-orange-600 font-semibold">{formatCurrency(totales.costo_pronta_vencer)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Usar hoy/mañana</p>
                </div>
                <div className="bg-white rounded-lg border-2 border-red-300 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign size={10} /> Costo merma total
                  </p>
                  <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(totales.costo_merma)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">= vencido + pronto a vencer</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Ingredientes afectados</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{totales.ingredientes_con_merma}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    de los cuales {totales.ingredientes_vencidos} ya vencidos
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Explicación del comportamiento FIFO */}
          <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              Cuando hay una <b>salida</b> (venta o descarte), el sistema rebaja primero del lote más antiguo (FIFO).
              Así <b>la merma se reduce antes que el stock fresco</b> — las ventas naturalmente consumen el producto que está más cerca de vencer.
            </p>
          </div>

          {/* Resumen por estado (filtros) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'vencido', count: vencidos.length, label: 'Vencidos',      bg: 'bg-red-50 border-red-200',       text: 'text-red-700' },
              { key: 'alto',    count: alto.length,     label: 'Vencen pronto', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
              { key: 'medio',   count: medio.length,    label: 'En vigilancia', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
              { key: 'ok',      count: ok.length,       label: 'Frescos',       bg: 'bg-green-50 border-green-200',   text: 'text-green-700' },
            ].map(({ key, count, label, bg, text }) => (
              <button
                key={key}
                onClick={() => setFiltro(filtro === key ? 'todos' : key as typeof filtro)}
                className={`rounded-xl border p-4 text-left transition-all ${bg} ${filtro === key ? 'ring-2 ring-offset-1 ring-current' : 'hover:shadow-sm'}`}
              >
                <p className={`text-2xl font-bold ${text}`}>{count}</p>
                <p className={`text-xs font-semibold ${text}`}>{label}</p>
              </button>
            ))}
          </div>

          {/* Filtro activo */}
          {filtro !== 'todos' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Mostrando: <span className="font-medium text-gray-700 capitalize">{filtro === 'alto' ? 'Vencen pronto' : filtro === 'ok' ? 'Frescos' : filtro === 'medio' ? 'En vigilancia' : 'Vencidos'}</span></span>
              <button onClick={() => setFiltro('todos')} className="text-brand-600 hover:text-brand-700 text-xs font-medium">Ver todos</button>
            </div>
          )}

          {/* Lista de ingredientes */}
          <div className="card divide-y divide-gray-100">
            {lista.map((item) => (
              <IngredienteRow key={item.ingrediente_id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
