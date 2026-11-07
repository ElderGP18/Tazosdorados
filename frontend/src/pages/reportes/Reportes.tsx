import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { subDays, subMonths, startOfMonth } from 'date-fns'
import { today as gtToday, toDateInput } from '../../utils/format'
import { getVentas } from '../../api/ventas'
import { getProductos, getCategorias } from '../../api/productos'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency, formatDateShort } from '../../utils/format'
import type { Venta, Producto, Categoria } from '../../types'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4']

// Solo estas categorías cuentan como "producto vendido" en los rankings
const CATEGORIAS_PRINCIPALES = ['Tacos', 'Quesadillas']

type Periodo = '7d' | '30d' | '3m'

export default function Reportes() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [soloPrincipales, setSoloPrincipales] = useState(true)

  const getFechas = (p: Periodo): [string, string] => {
    const hoy = new Date()
    const hasta = gtToday()
    const desde =
      p === '7d' ? toDateInput(subDays(hoy, 6).toISOString()) :
      p === '30d' ? toDateInput(subDays(hoy, 29).toISOString()) :
      toDateInput(startOfMonth(subMonths(hoy, 2)).toISOString())
    return [desde, hasta]
  }

  const load = async (p: Periodo) => {
    setLoading(true)
    const [desde, hasta] = getFechas(p)
    try {
      const { data } = await getVentas({ fecha_desde: desde, fecha_hasta: hasta, limit: 1000 })
      setVentas(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([getProductos(), getCategorias()]).then(([p, c]) => {
      setProductos(p.data)
      setCategorias(c.data)
    })
  }, [])
  useEffect(() => { load(periodo) }, [periodo])

  // Mapa categoria_id -> nombre categoría
  const catMap: Record<number, string> = {}
  categorias.forEach((c) => { catMap[c.id] = c.nombre })

  // Determina si un producto es un "principal" (taco o quesadilla)
  const esPrincipal = (productoId: number): boolean => {
    const prod = productos.find((p) => p.id === productoId)
    if (!prod || !prod.categoria_id) return false
    return CATEGORIAS_PRINCIPALES.includes(catMap[prod.categoria_id])
  }

  // Ventas por día
  const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
  const ventasPorDia = Array.from({ length: dias }, (_, i) => {
    const key = toDateInput(subDays(new Date(), dias - 1 - i).toISOString())
    const total = ventas.filter((v) => toDateInput(v.fecha) === key).reduce((s, v) => s + Number(v.total), 0)
    return { fecha: formatDateShort(key), total }
  })

  // Ventas por método de pago
  const pagoConteo: Record<string, number> = {}
  ventas.forEach((v) => { pagoConteo[v.metodo_pago] = (pagoConteo[v.metodo_pago] ?? 0) + Number(v.total) })
  const pagoData = Object.entries(pagoConteo).map(([name, value]) => ({ name, value }))

  // Producto más vendido — filtra opcionalmente a solo tacos y quesadillas
  const getNombreProducto = (id: number) =>
    productos.find((p) => p.id === id)?.nombre ?? `Producto #${id}`

  const prodConteo: Record<number, { nombre: string; cantidad: number; revenue: number }> = {}
  ventas.forEach((v) =>
    v.detalles?.forEach((d) => {
      // Filtro: ignorar extras/bebidas/guacamol cuando el toggle está activo
      if (soloPrincipales && !esPrincipal(d.producto_id)) return
      // Ignorar también precio 0 (guarniciones gratis) — si por alguna razón están en una categoría principal
      if (Number(d.precio_unitario) === 0) return
      if (!prodConteo[d.producto_id]) prodConteo[d.producto_id] = { nombre: getNombreProducto(d.producto_id), cantidad: 0, revenue: 0 }
      prodConteo[d.producto_id].cantidad += d.cantidad
      prodConteo[d.producto_id].revenue += Number(d.subtotal)
    })
  )
  const topProductos = Object.values(prodConteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8)

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)
  const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0
  const ventasDia = ventasPorDia.filter((d) => d.total > 0).length
  const promedioDiario = ventasDia > 0 ? totalVentas / ventasDia : 0

  // Unidades principales totales (tacos + quesadillas)
  const unidadesPrincipales = ventas.reduce((sum, v) => {
    return sum + (v.detalles?.reduce((s, d) => {
      if (!esPrincipal(d.producto_id)) return s
      if (Number(d.precio_unitario) === 0) return s
      return s + d.cantidad
    }, 0) ?? 0)
  }, 0)

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Análisis de desempeño del restaurante"
        action={
          <div className="flex gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '3m'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${periodo === p ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '3 meses'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total ventas" value={formatCurrency(totalVentas)} subtitle={`${ventas.length} transacciones`} icon={<span className="text-lg">💰</span>} iconBg="bg-brand-500" />
            <StatsCard title="Ticket promedio" value={formatCurrency(ticketPromedio)} subtitle="Por transacción" icon={<span className="text-lg">🧾</span>} iconBg="bg-blue-500" />
            <StatsCard title="Promedio diario" value={formatCurrency(promedioDiario)} subtitle={`${ventasDia} días con ventas`} icon={<span className="text-lg">📅</span>} iconBg="bg-purple-500" />
            <StatsCard title="Tacos + Quesadillas" value={`${unidadesPrincipales} uds`} subtitle="Platillos principales" icon={<span className="text-lg">🌮</span>} iconBg="bg-green-500" />
          </div>

          {/* Gráfica de ventas */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Evolución de ventas</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={ventasPorDia} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={dias > 30 ? 6 : dias > 7 ? 3 : 0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Q${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fill="url(#colorTotal)" name="Ventas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top productos */}
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Productos más vendidos</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {soloPrincipales ? 'Solo tacos y quesadillas' : 'Todas las categorías'}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={soloPrincipales}
                    onChange={(e) => setSoloPrincipales(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  Solo platillos
                </label>
              </div>
              {topProductos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {soloPrincipales ? 'Sin ventas de tacos o quesadillas en el período' : 'Sin datos'}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProductos} layout="vertical" margin={{ top: 0, right: 40, left: 60, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip
                      formatter={(v: number, _n: string, entry) => {
                        const rev = (entry.payload as { revenue?: number } | undefined)?.revenue
                        return [`${v} uds · ${formatCurrency(rev ?? 0)}`, 'Vendidas']
                      }}
                    />
                    <Bar dataKey="cantidad" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Por método de pago */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Ventas por método de pago</h3>
              {pagoData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pagoData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pagoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabla top productos con revenue */}
          {topProductos.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  Detalle · {soloPrincipales ? 'Tacos y Quesadillas' : 'Todos los productos'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="table-th">#</th>
                      <th className="table-th">Producto</th>
                      <th className="table-th text-right">Unidades</th>
                      <th className="table-th text-right">Ingresos</th>
                      <th className="table-th text-right">% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductos.map((p, i) => {
                      const totalUds = topProductos.reduce((s, x) => s + x.cantidad, 0)
                      const pct = totalUds > 0 ? (p.cantidad / totalUds * 100) : 0
                      return (
                        <tr key={p.nombre} className="table-tr">
                          <td className="table-td text-gray-400 font-mono">{i + 1}</td>
                          <td className="table-td font-medium">{p.nombre}</td>
                          <td className="table-td text-right font-semibold">{p.cantidad}</td>
                          <td className="table-td text-right">{formatCurrency(p.revenue)}</td>
                          <td className="table-td text-right text-gray-500">{pct.toFixed(1)}%</td>
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
