import { useEffect, useState } from 'react'
import { ShoppingCart, TrendingUp, Package, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { StatsCard } from '../components/common/StatsCard'
import { getVentas } from '../api/ventas'
import { getStockAlertas } from '../api/stock'
import { getPrediccionManana } from '../api/predicciones'
import { getIngredientes } from '../api/ingredientes'
import { formatCurrency, formatDateShort } from '../utils/format'
import type { Venta, Stock, PrediccionDia, Ingrediente } from '../types'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'

export default function Dashboard() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [alertas, setAlertas] = useState<Stock[]>([])
  const [prediccion, setPrediccion] = useState<PrediccionDia | null>(null)
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const desde = format(subDays(new Date(), 7), 'yyyy-MM-dd')
    Promise.allSettled([
      getVentas({ fecha_desde: desde, limit: 200 }),
      getStockAlertas(),
      getPrediccionManana(),
      getIngredientes(),
    ]).then(([v, a, p, i]) => {
      if (v.status === 'fulfilled') setVentas(v.value.data)
      if (a.status === 'fulfilled') setAlertas(a.value.data)
      if (p.status === 'fulfilled') setPrediccion(p.value.data)
      if (i.status === 'fulfilled') setIngredientes(i.value.data)
      setLoading(false)
    })
  }, [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const ventasHoy = ventas.filter((v) => v.fecha.startsWith(today))
  const totalHoy = ventasHoy.reduce((sum, v) => sum + Number(v.total), 0)
  const totalSemana = ventas.reduce((sum, v) => sum + Number(v.total), 0)

  // Ventas por día para la gráfica
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const key = format(d, 'yyyy-MM-dd')
    const total = ventas
      .filter((v) => v.fecha.startsWith(key))
      .reduce((s, v) => s + Number(v.total), 0)
    return { dia: formatDateShort(key), total }
  })

  // Producto más vendido
  const conteo: Record<number, { nombre: string; cantidad: number }> = {}
  ventas.forEach((v) =>
    v.detalles?.forEach((d) => {
      if (!conteo[d.producto_id]) conteo[d.producto_id] = { nombre: `Producto #${d.producto_id}`, cantidad: 0 }
      conteo[d.producto_id].cantidad += d.cantidad
    })
  )
  const topProducto = Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad)[0]

  const getIngNombre = (id: number) =>
    ingredientes.find((i) => i.id === id)?.nombre ?? `Ingrediente #${id}`

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Ventas hoy"
          value={formatCurrency(totalHoy)}
          subtitle={`${ventasHoy.length} transacciones`}
          icon={<ShoppingCart size={20} />}
          iconBg="bg-brand-500"
          loading={loading}
        />
        <StatsCard
          title="Ventas (7 días)"
          value={formatCurrency(totalSemana)}
          subtitle={`${ventas.length} transacciones`}
          icon={<TrendingUp size={20} />}
          iconBg="bg-blue-500"
          loading={loading}
        />
        <StatsCard
          title="Predicción mañana"
          value={prediccion ? `${prediccion.total_unidades} uds` : '—'}
          subtitle={prediccion ? `${prediccion.productos.length} productos` : 'Modelo no entrenado'}
          icon={<Package size={20} />}
          iconBg="bg-purple-500"
          loading={loading}
        />
        <StatsCard
          title="Alertas de stock"
          value={alertas.length}
          subtitle={alertas.length > 0 ? 'Ingredientes bajo mínimo' : 'Todo en orden'}
          icon={<AlertTriangle size={20} />}
          iconBg={alertas.length > 0 ? 'bg-red-500' : 'bg-green-500'}
          loading={loading}
        />
      </div>

      {/* Chart + Alertas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfica */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Ventas últimos 7 días</h3>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Spinner className="text-brand-400" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ultimos7} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Producto top */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Más vendido (7 días)</h3>
            {loading ? (
              <Spinner size="sm" className="text-brand-400" />
            ) : topProducto ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold text-lg">
                  🌮
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{topProducto.nombre}</p>
                  <p className="text-sm text-gray-500">{topProducto.cantidad} unidades</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </div>

          {/* Alertas stock */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">
              Alertas de stock
              {alertas.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                  {alertas.length}
                </span>
              )}
            </h3>
            {loading ? (
              <Spinner size="sm" className="text-brand-400" />
            ) : alertas.length === 0 ? (
              <p className="text-sm text-green-600 font-medium">✓ Stock en niveles normales</p>
            ) : (
              <ul className="space-y-2">
                {alertas.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate">{getIngNombre(a.ingrediente_id)}</span>
                    <Badge variant="danger">{a.cantidad_disponible} restante</Badge>
                  </li>
                ))}
                {alertas.length > 5 && (
                  <p className="text-xs text-gray-400">+{alertas.length - 5} más</p>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Predicción mañana */}
      {prediccion && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            Predicción para mañana — {prediccion.total_unidades} unidades totales
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {prediccion.productos.slice(0, 10).map((p) => (
              <div key={p.producto_id} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{p.unidades_predichas}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight truncate">{p.nombre}</p>
                <p className="text-xs text-brand-600 font-medium mt-1">{p.porcentaje}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas recientes */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ventas de hoy</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner className="text-brand-400" /></div>
        ) : ventasHoy.length === 0 ? (
          <p className="text-center py-10 text-sm text-gray-400">Sin ventas registradas hoy</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Hora</th>
                  <th className="table-th">Productos</th>
                  <th className="table-th">Pago</th>
                  <th className="table-th text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasHoy.map((v) => (
                  <tr key={v.id} className="table-tr">
                    <td className="table-td text-gray-400">#{v.id}</td>
                    <td className="table-td">{v.fecha.substring(11, 16)}</td>
                    <td className="table-td">{v.detalles?.length ?? 0} items</td>
                    <td className="table-td capitalize">{v.metodo_pago}</td>
                    <td className="table-td text-right font-semibold text-gray-900">
                      {formatCurrency(Number(v.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
