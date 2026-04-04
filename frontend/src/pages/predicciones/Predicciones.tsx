import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, Calendar } from 'lucide-react'
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
import type { PrediccionDia, EstadoModelo } from '../../types'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

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
      toast.success('Modelo reentrenado exitosamente')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setRetraining(false)
    }
  }

  const chartData7 = semana.map((d) => ({
    fecha: new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', weekday: 'short', day: '2-digit' }).format(new Date(d.fecha + 'T12:00:00')),
    unidades: d.total_unidades,
  }))

  return (
    <div>
      <PageHeader
        title="Predicciones de demanda"
        description="Proyecciones basadas en historial de ventas"
        action={
          <button onClick={handleReentrenar} className="btn-secondary" disabled={retraining}>
            {retraining ? <Spinner size="sm" className="text-brand-500" /> : <RefreshCw size={15} />}
            {retraining ? 'Entrenando...' : 'Reentrenar modelo'}
          </button>
        }
      />

      {/* Estado del modelo */}
      {estado && (
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${estado.modelo_disponible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <span className="text-lg">{estado.modelo_disponible ? '✅' : '⚠️'}</span>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="text-gray-500">Estado: </span>
              <span className="font-medium">{estado.modelo_disponible ? 'Modelo entrenado' : 'Sin modelo — ejecuta reentrenamiento'}</span>
            </div>
            {estado.entrenado_en && (
              <div><span className="text-gray-500">Último entrenamiento: </span><span className="font-medium">{formatDateTime(estado.entrenado_en)}</span></div>
            )}
            {estado.dias_historicos && (
              <div><span className="text-gray-500">Días de historial: </span><span className="font-medium">{estado.dias_historicos}</span></div>
            )}
            {estado.mae_cv !== undefined && (
              <div><span className="text-gray-500">MAE: </span><span className="font-medium">{estado.mae_cv} uds</span></div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : !estado?.modelo_disponible ? (
        <div className="card p-12 text-center">
          <TrendingUp size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">El modelo aún no está entrenado</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Necesitas al menos 14 días de historial de ventas para entrenar el modelo</p>
          <button onClick={handleReentrenar} className="btn-primary mx-auto" disabled={retraining}>
            {retraining ? <Spinner size="sm" className="text-white" /> : 'Entrenar modelo ahora'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Predicción mañana */}
          {manana && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar size={14} />
                  Mañana — {formatDate(manana.fecha)}
                </div>
                <p className="text-4xl font-bold text-gray-900">{manana.total_unidades}</p>
                <p className="text-gray-500 text-sm mt-1">unidades estimadas</p>
              </div>

              <div className="card p-5 lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-3">Desglose por producto</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {manana.productos.map((p, i) => (
                    <div key={p.producto_id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{p.unidades_predichas}</p>
                        <p className="text-xs text-gray-500 truncate">{p.nombre}</p>
                        <p className="text-xs text-gray-400">{p.porcentaje}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Gráfica 7 días */}
          {semana.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Próximos 7 días — demanda estimada</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData7} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`${v} unidades`, 'Predicción']} />
                  <Bar dataKey="unidades" radius={[4, 4, 0, 0]}>
                    {chartData7.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#f59e0b' : '#fcd34d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla 7 días */}
          {semana.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Predicción detallada por día</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-th">Fecha</th>
                      <th className="table-th text-right">Total (uds)</th>
                      <th className="table-th">Top productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semana.map((d) => (
                      <tr key={d.fecha} className="table-tr">
                        <td className="table-td font-medium">{formatDate(d.fecha)}</td>
                        <td className="table-td text-right font-bold text-gray-900">{d.total_unidades}</td>
                        <td className="table-td">
                          <div className="flex flex-wrap gap-1">
                            {d.productos.slice(0, 4).map((p) => (
                              <span key={p.producto_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {p.nombre}: {p.unidades_predichas}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
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
