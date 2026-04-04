import { useEffect, useState } from 'react'
import { RefreshCw, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { getAllMovimientos } from '../../api/stock'
import { getIngredientes } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { formatDateTime } from '../../utils/format'
import type { MovimientoStock, Ingrediente } from '../../types'

export default function MovimientosStock() {
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'entrada' | 'salida'>('todos')

  const load = async () => {
    setLoading(true)
    try {
      const [m, i] = await Promise.all([getAllMovimientos(200), getIngredientes()])
      setMovimientos(m.data)
      setIngredientes(i.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const getNombre = (id: number) => ingredientes.find((i) => i.id === id)?.nombre ?? `#${id}`
  const getUnidad = (id: number) => ingredientes.find((i) => i.id === id)?.unidad_medida ?? ''

  const lista = filtro === 'todos' ? movimientos : movimientos.filter((m) => m.tipo === filtro)
  const entradas = movimientos.filter((m) => m.tipo === 'entrada').length
  const salidas = movimientos.filter((m) => m.tipo === 'salida').length

  return (
    <div>
      <PageHeader
        title="Movimientos de stock"
        description="Entradas manuales y salidas automáticas por ventas"
        action={
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <ArrowUpCircle size={28} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{entradas}</p>
            <p className="text-xs text-gray-500">Entradas registradas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <ArrowDownCircle size={28} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{salidas}</p>
            <p className="text-xs text-gray-500">Salidas por ventas</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-sm font-bold">
            #
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{movimientos.length}</p>
            <p className="text-xs text-gray-500">Total movimientos</p>
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {(['todos', 'entrada', 'salida'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              filtro === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Salidas'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
        ) : lista.length === 0 ? (
          <p className="text-center py-14 text-gray-400">Sin movimientos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Fecha y hora</th>
                  <th className="table-th">Ingrediente</th>
                  <th className="table-th">Tipo</th>
                  <th className="table-th text-right">Cantidad</th>
                  <th className="table-th">Referencia</th>
                  <th className="table-th">Notas</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id} className="table-tr">
                    <td className="table-td text-xs text-gray-500">{formatDateTime(m.fecha)}</td>
                    <td className="table-td font-medium text-gray-900">{getNombre(m.ingrediente_id)}</td>
                    <td className="table-td">
                      <Badge variant={m.tipo === 'entrada' ? 'success' : 'danger'}>
                        {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                      </Badge>
                    </td>
                    <td className="table-td text-right font-mono font-semibold">
                      {Number(m.cantidad).toFixed(4)} {getUnidad(m.ingrediente_id)}
                    </td>
                    <td className="table-td text-xs text-gray-500 font-mono">{m.referencia ?? '—'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-xs truncate">{m.notas ?? '—'}</td>
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
