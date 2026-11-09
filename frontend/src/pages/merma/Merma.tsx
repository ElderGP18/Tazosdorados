import { useEffect, useState } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Info } from 'lucide-react'
import { getRiesgoMerma } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import type { ItemMermaFrescura, LoteMerma, TotalesMerma } from '../../types'

// ─── Helpers de texto humano ────────────────────────────────────────────
/** Genera una frase simple sobre el estado de frescura de un lote. */
function textoLote(lote: LoteMerma): { texto: string; color: string; icon: string } {
  if (lote.estado === 'vencido') {
    const dias = Math.max(1, lote.dias_en_stock - (lote.dias_en_stock - lote.dias_restantes))
    return {
      texto: dias === 1 ? 'Venció ayer' : `Venció hace ${dias} días`,
      color: 'text-red-700 bg-red-50 border-red-200',
      icon: '🔴',
    }
  }
  if (lote.dias_restantes === 0) {
    return { texto: 'Vence hoy — usar ya', color: 'text-red-700 bg-red-50 border-red-200', icon: '🔴' }
  }
  if (lote.dias_restantes === 1) {
    return { texto: 'Vence mañana', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: '🟠' }
  }
  if (lote.dias_restantes <= 3) {
    return { texto: `Vence en ${lote.dias_restantes} días`, color: 'text-orange-700 bg-orange-50 border-orange-200', icon: '🟠' }
  }
  if (lote.estado === 'medio') {
    return { texto: `Vence en ${lote.dias_restantes} días`, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: '🟡' }
  }
  return { texto: `Fresco · vence en ${lote.dias_restantes} días`, color: 'text-green-700 bg-green-50 border-green-200', icon: '🟢' }
}

/** Resumen de una fila de ingrediente — frase única, grande. */
function resumenIngrediente(item: ItemMermaFrescura): { texto: string; color: string; icon: string } {
  if (item.cantidad_vencida > 0) {
    return {
      texto: `${item.cantidad_vencida.toFixed(2)} ${item.unidad_medida} ya vencidos`,
      color: 'text-red-700',
      icon: '🔴',
    }
  }
  if (item.cantidad_pronta_vencer > 0) {
    const diasMin = item.lotes.length > 0 ? item.lotes[0].dias_restantes : 0
    const cuando = diasMin === 0 ? 'hoy' : diasMin === 1 ? 'mañana' : `en ${diasMin} días`
    return {
      texto: `${item.cantidad_pronta_vencer.toFixed(2)} ${item.unidad_medida} vencen ${cuando}`,
      color: 'text-orange-700',
      icon: '🟠',
    }
  }
  if (item.estado_general === 'medio') {
    const diasMin = item.lotes.length > 0 ? item.lotes[0].dias_restantes : 0
    return {
      texto: `Vigilar · el lote más viejo vence en ${diasMin} días`,
      color: 'text-yellow-700',
      icon: '🟡',
    }
  }
  const diasMin = item.lotes.length > 0 ? item.lotes[0].dias_restantes : 0
  return {
    texto: `Fresco · vence en ${diasMin} días`,
    color: 'text-green-700',
    icon: '🟢',
  }
}

function IngredienteCard({ item }: { item: ItemMermaFrescura }) {
  const [expanded, setExpanded] = useState(false)
  const resumen = resumenIngrediente(item)
  const tieneMerma = item.stock_merma > 0

  // Color de fondo según estado
  const bgColor =
    item.estado_general === 'vencido' ? 'bg-red-50/40 border-l-4 border-l-red-500' :
    item.estado_general === 'alto'    ? 'bg-orange-50/40 border-l-4 border-l-orange-500' :
    item.estado_general === 'medio'   ? 'bg-yellow-50/30 border-l-4 border-l-yellow-400' :
    'border-l-4 border-l-green-400'

  return (
    <div className={`px-5 py-4 ${bgColor}`}>
      {/* ─── Línea 1: Nombre + resumen humano ─────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{resumen.icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-base">{item.nombre}</p>
            <p className={`text-sm font-medium ${resumen.color}`}>{resumen.texto}</p>
          </div>
        </div>

        {/* Stock total a la derecha */}
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Stock total</p>
          <p className="text-lg font-bold text-gray-900">
            {item.stock_actual.toFixed(2)} <span className="text-xs font-normal text-gray-400">{item.unidad_medida}</span>
          </p>
        </div>
      </div>

      {/* ─── Línea 2: Tarjetas Bueno vs Merma ───────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-[11px] text-green-700 font-semibold uppercase tracking-wide">✓ Se puede usar</p>
          <p className="text-xl font-bold text-green-700 mt-0.5">
            {item.stock_bueno.toFixed(2)} <span className="text-sm font-normal text-green-600">{item.unidad_medida}</span>
          </p>
        </div>
        <div className={`rounded-lg border px-3 py-2 ${tieneMerma ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${tieneMerma ? 'text-red-700' : 'text-gray-500'}`}>
            ✗ Se va a perder
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-0.5">
            <p className={`text-xl font-bold ${tieneMerma ? 'text-red-700' : 'text-gray-400'}`}>
              {item.stock_merma.toFixed(2)} <span className="text-sm font-normal">{item.unidad_medida}</span>
            </p>
            {tieneMerma && (
              <p className="text-sm font-bold text-red-700">{formatCurrency(item.costo_merma)}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Línea 3: Desglose por lote (expandible) ─────────────── */}
      {item.lotes.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium mt-2.5"
        >
          {expanded ? 'Ocultar detalle' : `Ver detalle (${item.lotes.length} ${item.lotes.length === 1 ? 'compra' : 'compras'})`}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {item.lotes.map((lote, i) => {
            const t = textoLote(lote)
            return (
              <div key={i} className={`flex items-center justify-between rounded-md border px-3 py-2 ${t.color}`}>
                <div className="flex items-center gap-2">
                  <span>{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{lote.cantidad.toFixed(2)} {item.unidad_medida}</p>
                    <p className="text-xs">{t.texto}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {lote.dias_en_stock === 0 ? 'Entró hoy' : `Entró hace ${lote.dias_en_stock} día${lote.dias_en_stock !== 1 ? 's' : ''}`}
                </p>
              </div>
            )
          })}
        </div>
      )}
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
        description="Qué producto se está echando a perder y cuánto cuesta"
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
          {/* ── TOTALES: lo más importante arriba ───────────────────── */}
          {totales && (
            <div className={`rounded-2xl border-2 p-5 shadow-sm animate-scale-in ${totales.costo_merma > 0 ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className={totales.costo_merma > 0 ? 'text-red-600' : 'text-green-600'} />
                <h3 className="font-display font-bold text-gray-900 text-xl">
                  {totales.costo_merma > 0
                    ? <>Estás perdiendo <span className="text-red-700">{formatCurrency(totales.costo_merma)}</span> en merma</>
                    : '✓ No hay merma — todo el stock se puede usar'}
                </h3>
              </div>
              {totales.costo_merma > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg border border-red-300 p-3">
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">🔴 Ya vencido</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{totales.cantidad_vencida.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">unidades · hay que descartar</p>
                    <p className="text-sm font-bold text-red-700 mt-1">{formatCurrency(totales.costo_vencida)}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-orange-300 p-3">
                    <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide">🟠 Vence en 1-3 días</p>
                    <p className="text-2xl font-bold text-orange-700 mt-1">{totales.cantidad_pronta_vencer.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">unidades · usar YA</p>
                    <p className="text-sm font-bold text-orange-700 mt-1">{formatCurrency(totales.costo_pronta_vencer)}</p>
                  </div>
                  <div className="bg-white rounded-lg border-2 border-red-400 p-3 col-span-2 lg:col-span-1">
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <DollarSign size={10} /> Pérdida total
                    </p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totales.costo_merma)}</p>
                    <p className="text-xs text-gray-500">en {totales.ingredientes_con_merma} ingrediente{totales.ingredientes_con_merma !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Explicación corta */}
          <div className="flex items-start gap-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              Cuando se vende un taco, el sistema rebaja primero el ingrediente más viejo (FIFO) —
              así el producto por vencer se gasta antes que el fresco.
            </p>
          </div>

          {/* Filtros por estado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'vencido', count: vencidos.length, label: '🔴 Vencidos',     bg: 'bg-red-50 border-red-200',       text: 'text-red-700' },
              { key: 'alto',    count: alto.length,     label: '🟠 Por vencer',   bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
              { key: 'medio',   count: medio.length,    label: '🟡 Vigilar',      bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
              { key: 'ok',      count: ok.length,       label: '🟢 Frescos',      bg: 'bg-green-50 border-green-200',   text: 'text-green-700' },
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

          {filtro !== 'todos' && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => setFiltro('todos')} className="text-brand-600 hover:text-brand-700 text-xs font-medium">Ver todos</button>
            </div>
          )}

          {/* Lista de ingredientes */}
          <div className="card divide-y divide-gray-100 stagger">
            {lista.map((item) => (
              <div key={item.ingrediente_id} className="animate-fade-in-up">
                <IngredienteCard item={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
