import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getEstadoModelo, reentrenarModelo, getPrediccionManana, getPrediccion7Dias } from '../../api/predicciones'
import { PageHeader } from '../../components/common/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatDateTime } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { PrediccionDia, EstadoModelo, ProductoPrediccion } from '../../types'

const DIAS_PICO = ['vie', 'sáb', 'sab', 'dom', 'fri', 'sat', 'sun']

const CAT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Tacos:       { label: 'Tacos',       color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  Quesadillas: { label: 'Quesadillas', color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  Bebidas:     { label: 'Bebidas',     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
  Extras:      { label: 'Extras',      color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200'   },
  Otros:       { label: 'Otros',       color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200'   },
}

const CAT_ORDER = ['Tacos', 'Quesadillas', 'Bebidas', 'Extras', 'Otros']

function groupByCategory(productos: ProductoPrediccion[]): Record<string, ProductoPrediccion[]> {
  return productos.reduce<Record<string, ProductoPrediccion[]>>((acc, p) => {
    const cat = p.categoria || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})
}

function CategoryBlock({ cat, productos }: { cat: string; productos: ProductoPrediccion[] }) {
  const [open, setOpen] = useState(true)
  const cfg = CAT_CONFIG[cat] ?? CAT_CONFIG.Otros
  const total = productos.reduce((s, p) => s + p.unidades_predichas, 0)
  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg}`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
            {Math.round(total)} uds
          </span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {productos.map((p) => (
            <div key={p.producto_id} className="flex items-center justify-between px-4 py-2 bg-white text-sm">
              <span className="text-gray-700">{p.nombre}</span>
              <span className={`font-semibold ${cfg.color}`}>{p.unidades_predichas}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Predicciones() {
  const [estado, setEstado] = useState<EstadoModelo | null>(null)
  const [manana, setManana] = useState<PrediccionDia | null>(null)
  const [semana, setSemana] = useState<PrediccionDia[]>([])
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [e, m, s] = await Promise.allSettled([
      getEstadoModelo(),
      getPrediccionManana(),
      getPrediccion7Dias(),
    ])
    if (e.status === 'fulfilled') setEstado(e.value.data)
    if (m.status === 'fulfilled') setManana(m.value.data)
    if (s.status === 'fulfilled') setSemana(s.value.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleReentrenar = async () => {
    setRetraining(true)
    try {
      await reentrenarModelo()
      toast.success('Modelo reentrenado')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setRetraining(false)
    }
  }

  const chartData7 = semana.map((d) => {
    const dt = new Date(d.fecha + 'T12:00:00')
    const label = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', weekday: 'short', day: '2-digit' }).format(dt)
    const abrev = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', weekday: 'short' }).format(dt).toLowerCase()
    return { fecha: label, unidades: d.total_unidades, pico: DIAS_PICO.some(x => abrev.startsWith(x)) }
  })

  const confidencia = estado?.dias_historicos
    ? estado.dias_historicos >= 60 ? 'alta' : estado.dias_historicos >= 30 ? 'media' : 'baja'
    : null

  return (
    <div>
      <PageHeader
        title="Predicciones de demanda"
        description="Estimaciones por día de semana basadas en historial real de ventas"
        action={
          <button onClick={handleReentrenar} className="btn-secondary" disabled={retraining}>
            {retraining ? <Spinner size="sm" className="text-brand-500" /> : <RefreshCw size={15} />}
            {retraining ? 'Entrenando…' : 'Reentrenar'}
          </button>
        }
      />

      {/* Estado del modelo */}
      {estado && (
        <div className={`rounded-xl border p-4 mb-6 ${estado.modelo_disponible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            <div>
              <span className="text-gray-500">Estado: </span>
              <span className="font-medium">{estado.modelo_disponible ? 'Activo' : 'Sin modelo'}</span>
            </div>
            {estado.entrenado_en && (
              <div><span className="text-gray-500">Entrenado: </span><span className="font-medium">{formatDateTime(estado.entrenado_en)}</span></div>
            )}
            {estado.dias_historicos !== undefined && (
              <div><span className="text-gray-500">Días historial: </span><span className="font-medium">{estado.dias_historicos}</span></div>
            )}
            {estado.mae_cv !== undefined && (
              <div><span className="text-gray-500">Error promedio: </span><span className="font-medium">±{estado.mae_cv} uds</span></div>
            )}
            {confidencia && (
              <Badge variant={confidencia === 'alta' ? 'success' : confidencia === 'media' ? 'warning' : 'danger'}>
                Confianza {confidencia}
              </Badge>
            )}
          </div>
          {confidencia === 'baja' && (
            <p className="text-xs text-yellow-600 mt-2">
              Menos de 30 días de historial: las predicciones usan promedios por día de semana.
              Reentrenar cada semana mejora la precisión progresivamente.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : !estado?.modelo_disponible ? (
        <div className="card p-12 text-center">
          <TrendingUp size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Modelo no entrenado</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Se necesitan al menos 14 días de historial</p>
          <button onClick={handleReentrenar} className="btn-primary mx-auto" disabled={retraining}>
            {retraining ? <Spinner size="sm" className="text-white" /> : 'Entrenar ahora'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Gráfica — barras naranja en días pico */}
          {semana.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Próximos 7 días</h3>
              <p className="text-xs text-gray-400 mb-4">
                Naranja = días pico (Vie/Sáb/Dom) · unidades pagadas estimadas, sin guarniciones gratis
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData7} margin={{ top: 4, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} uds`, 'Estimado']} />
                  <Bar dataKey="unidades" radius={[4, 4, 0, 0]}>
                    {chartData7.map((e, i) => (
                      <Cell key={i} fill={e.pico ? '#f97316' : '#fcd34d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Predicción mañana — por categoría */}
          {manana && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="card p-5 flex flex-col justify-center lg:col-span-2">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar size={14} /> Mañana — {formatDate(manana.fecha)}
                </div>
                <p className="text-5xl font-bold text-gray-900 leading-none">{manana.total_unidades}</p>
                <p className="text-gray-500 text-sm mt-2">unidades pagadas estimadas</p>
                <p className="text-xs text-gray-400 mt-1">Guarniciones gratis no cuentan</p>
              </div>
              <div className="card p-5 lg:col-span-3">
                <h3 className="font-semibold text-gray-900 mb-3">Desglose por categoría</h3>
                <div className="space-y-2">
                  {CAT_ORDER
                    .filter(cat => groupByCategory(manana.productos)[cat])
                    .map(cat => (
                      <CategoryBlock key={cat} cat={cat} productos={groupByCategory(manana.productos)[cat]} />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tabla 7 días */}
          {semana.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Detalle por día</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-th">Fecha</th>
                      <th className="table-th text-right">Total uds</th>
                      <th className="table-th">Tacos/Quesadillas</th>
                      <th className="table-th">Bebidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semana.map((d) => {
                      const dt = new Date(d.fecha + 'T12:00:00')
                      const abrev = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', weekday: 'short' }).format(dt).toLowerCase()
                      const pico = DIAS_PICO.some(x => abrev.startsWith(x))
                      const bycat = groupByCategory(d.productos)
                      const tq = [...(bycat.Tacos ?? []), ...(bycat.Quesadillas ?? [])]
                      const beb = bycat.Bebidas ?? []
                      return (
                        <tr key={d.fecha} className={`table-tr ${pico ? 'bg-orange-50/30' : ''}`}>
                          <td className="table-td">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatDate(d.fecha)}</span>
                              {pico && <Badge variant="warning">Pico</Badge>}
                            </div>
                          </td>
                          <td className="table-td text-right font-bold text-gray-900">{d.total_unidades}</td>
                          <td className="table-td">
                            <div className="flex flex-wrap gap-1">
                              {tq.slice(0, 5).map(p => (
                                <span key={p.producto_id} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  {p.nombre.replace('Taco de ', '').replace('Taco al ', '').replace('Quesadilla de ', 'Q/')}: {p.unidades_predichas}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="table-td">
                            {beb.length > 0
                              ? beb.map(p => (
                                <span key={p.producto_id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mr-1">
                                  {p.nombre}: {p.unidades_predichas}
                                </span>
                              ))
                              : <span className="text-xs text-gray-400">—</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
