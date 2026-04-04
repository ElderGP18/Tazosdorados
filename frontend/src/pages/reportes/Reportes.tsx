import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format, subDays, subMonths, startOfMonth } from 'date-fns'
import { getVentas } from '../../api/ventas'
import { PageHeader } from '../../components/common/PageHeader'
import { StatsCard } from '../../components/common/StatsCard'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency, formatDate, formatDateShort } from '../../utils/format'
import type { Venta } from '../../types'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4']

type Periodo = '7d' | '30d' | '3m'

export default function Reportes() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('30d')

  const getFechas = (p: Periodo): [string, string] => {
    const hoy = new Date()
    const hasta = format(hoy, 'yyyy-MM-dd')
    const desde =
      p === '7d' ? format(subDays(hoy, 6), 'yyyy-MM-dd') :
      p === '30d' ? format(subDays(hoy, 29), 'yyyy-MM-dd') :
      format(startOfMonth(subMonths(hoy, 2)), 'yyyy-MM-dd')
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

  useEffect(() => { load(periodo) }, [periodo])

  // Ventas por día
  const [desde] = getFechas(periodo)
  const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
  const ventasPorDia = Array.from({ length: dias }, (_, i) => {
    const d = subDays(new Date(), dias - 1 - i)
    const key = format(d, 'yyyy-MM-dd')
    const total = ventas.filter((v) => v.fecha.startsWith(key)).reduce((s, v) => s + Number(v.total), 0)
    return { fecha: formatDateShort(key), total }
  })

  // Ventas por método de pago
  const pagoConteo: Record<string, number> = {}
  ventas.forEach((v) => { pagoConteo[v.metodo_pago] = (pagoConteo[v.metodo_pago] ?? 0) + Number(v.total) })
  const pagoData = Object.entries(pagoConteo).map(([name, value]) => ({ name, value }))

  // Producto más vendido
  const prodConteo: Record<number, { nombre: string; cantidad: number; revenue: number }> = {}
  ventas.forEach((v) =>
    v.detalles?.forEach((d) => {
      if (!prodConteo[d.producto_id]) prodConteo[d.producto_id] = { nombre: `Producto #${d.producto_id}`, cantidad: 0, revenue: 0 }
      prodConteo[d.producto_id].cantidad += d.cantidad
      prodConteo[d.producto_id].revenue += Number(d.subtotal)
    })
  )
  const topProductos = Object.values(prodConteo).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8)

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)
  const ticketPromedio = ventas.length > 0 ? totalVentas / ventas.length : 0
  const ventasDia = ventasPorDia.filter((d) => d.total > 0).length
  const promedioDiario = ventasDia > 0 ? totalVentas / ventasDia : 0

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
            <StatsCard title="Mejor producto" value={topProductos[0]?.nombre ?? '—'} subtitle={topProductos[0] ? `${topProductos[0].cantidad} uds vendidas` : ''} icon={<span className="text-lg">⭐</span>} iconBg="bg-green-500" />
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
              <h3 className="font-semibold text-gray-900 mb-4">Productos más vendidos</h3>
              {topProductos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProductos} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: number) => [`${v} uds`, 'Vendidas']} />
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
        </div>
      )}
    </div>
  )
}
