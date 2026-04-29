import { useEffect, useState } from 'react'
import { Plus, History, ArrowUpCircle, ArrowDownCircle, Package, AlertTriangle, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStock, registrarMovimiento, getMovimientos, actualizarMinimos } from '../../api/stock'
import { getIngredientes } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { formatDateTime } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { Stock as StockType, MovimientoStock, Ingrediente } from '../../types'

export default function Stock() {
  const [stock, setStock] = useState<StockType[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingMinimos, setUpdatingMinimos] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialIng, setHistorialIng] = useState<Ingrediente | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'alerta' | 'normal'>('todos')
  const [form, setForm] = useState({ ingrediente_id: '', tipo: 'entrada' as 'entrada' | 'salida', cantidad: '', notas: '' })

  const handleActualizarMinimos = async () => {
    setUpdatingMinimos(true)
    try {
      const { data } = await actualizarMinimos()
      toast.success(`Mínimos actualizados: ${data.actualizados} ingredientes`)
      load()
    } catch {
      toast.error('Error al actualizar mínimos')
    } finally {
      setUpdatingMinimos(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([getStock(), getIngredientes()])
      setStock(s.data)
      setIngredientes(i.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openHistorial = async (ing: Ingrediente) => {
    setHistorialIng(ing)
    setHistorialOpen(true)
    setMovimientos([])
    const { data } = await getMovimientos(ing.id)
    setMovimientos(data)
  }

  const handleSave = async () => {
    if (!form.ingrediente_id || !form.cantidad) { toast.error('Completa todos los campos'); return }
    setSaving(true)
    try {
      await registrarMovimiento({
        ingrediente_id: parseInt(form.ingrediente_id),
        tipo: form.tipo,
        cantidad: parseFloat(form.cantidad),
        notas: form.notas || undefined,
      })
      toast.success('Movimiento registrado')
      setModalOpen(false)
      setForm({ ingrediente_id: '', tipo: 'entrada', cantidad: '', notas: '' })
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const getIngNombre = (id: number) => ingredientes.find((i) => i.id === id)?.nombre ?? `#${id}`
  const getIngUnidad = (id: number) => ingredientes.find((i) => i.id === id)?.unidad_medida ?? ''

  const getStatus = (s: StockType) => {
    if (Number(s.cantidad_disponible) <= 0)
      return { label: 'Sin stock', variant: 'danger' as const, color: 'red', pct: 0 }
    if (Number(s.cantidad_disponible) < Number(s.cantidad_minima))
      return { label: 'Bajo mínimo', variant: 'warning' as const, color: 'yellow', pct: Math.round((Number(s.cantidad_disponible) / Number(s.cantidad_minima)) * 100) }
    const pct = Number(s.cantidad_minima) > 0
      ? Math.min(100, Math.round((Number(s.cantidad_disponible) / (Number(s.cantidad_minima) * 3)) * 100))
      : 100
    return { label: 'Normal', variant: 'success' as const, color: 'green', pct }
  }

  const sinStock = stock.filter((s) => Number(s.cantidad_disponible) <= 0)
  const bajoMinimo = stock.filter((s) => Number(s.cantidad_disponible) > 0 && Number(s.cantidad_disponible) < Number(s.cantidad_minima))
  const normal = stock.filter((s) => Number(s.cantidad_disponible) >= Number(s.cantidad_minima))

  const lista = filtro === 'alerta' ? [...sinStock, ...bajoMinimo] : filtro === 'normal' ? normal : stock

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock"
        description="Control de inventario de ingredientes"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleActualizarMinimos}
              className="btn-secondary"
              disabled={updatingMinimos}
              title="Recalcula los mínimos según el consumo real de los últimos 28 días"
            >
              <Settings2 size={15} className={updatingMinimos ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar mínimos</span>
            </button>
            <button
              onClick={() => { setModalOpen(true); setForm({ ingrediente_id: String(ingredientes[0]?.id ?? ''), tipo: 'entrada', cantidad: '', notas: '' }) }}
              className="btn-primary"
            >
              <Plus size={16} /> Registrar movimiento
            </button>
          </div>
        }
      />

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFiltro(filtro === 'alerta' ? 'todos' : 'alerta')}
          className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${filtro === 'alerta' ? 'ring-2 ring-red-400' : ''} ${sinStock.length + bajoMinimo.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-3xl font-bold ${sinStock.length + bajoMinimo.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {sinStock.length + bajoMinimo.length}
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${sinStock.length + bajoMinimo.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                Con alertas
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{sinStock.length} sin stock · {bajoMinimo.length} bajo mínimo</p>
            </div>
            <AlertTriangle size={28} className={sinStock.length + bajoMinimo.length > 0 ? 'text-red-400' : 'text-gray-300'} />
          </div>
        </button>

        <button
          onClick={() => setFiltro(filtro === 'normal' ? 'todos' : 'normal')}
          className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${filtro === 'normal' ? 'ring-2 ring-green-400' : ''} bg-green-50 border-green-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">{normal.length}</p>
              <p className="text-sm font-semibold text-green-700 mt-0.5">En orden</p>
              <p className="text-xs text-gray-400 mt-0.5">Stock sobre el mínimo</p>
            </div>
            <Package size={28} className="text-green-400" />
          </div>
        </button>

        <div className="rounded-xl border bg-blue-50 border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">{stock.length}</p>
              <p className="text-sm font-semibold text-blue-700 mt-0.5">Total ingredientes</p>
              <p className="text-xs text-gray-400 mt-0.5">En inventario</p>
            </div>
            <ArrowUpCircle size={28} className="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filtro activo */}
      {filtro !== 'todos' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Mostrando: <span className="font-medium text-gray-700">{filtro === 'alerta' ? 'Con alertas' : 'En orden'}</span></span>
          <button onClick={() => setFiltro('todos')} className="text-brand-600 hover:text-brand-700 text-xs font-medium">Ver todos</button>
        </div>
      )}

      {/* Tarjetas de ingredientes */}
      {loading ? (
        <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((s) => {
            const status = getStatus(s)
            const nombre = getIngNombre(s.ingrediente_id)
            const unidad = getIngUnidad(s.ingrediente_id)
            const ing = ingredientes.find((i) => i.id === s.ingrediente_id)
            const barColor =
              status.color === 'red' ? 'bg-red-500' :
              status.color === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'
            const cardBorder =
              status.color === 'red' ? 'border-red-200 bg-red-50/30' :
              status.color === 'yellow' ? 'border-yellow-200 bg-yellow-50/20' :
              'border-gray-200 bg-white'

            return (
              <div key={s.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${cardBorder}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      status.color === 'red' ? 'bg-red-100' :
                      status.color === 'yellow' ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <Package size={16} className={
                        status.color === 'red' ? 'text-red-500' :
                        status.color === 'yellow' ? 'text-yellow-500' : 'text-green-600'
                      } />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{nombre}</p>
                      <p className="text-xs text-gray-400">{unidad}</p>
                    </div>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {/* Cantidad principal */}
                <div className="mb-3">
                  <p className={`text-2xl font-bold ${
                    status.color === 'red' ? 'text-red-600' :
                    status.color === 'yellow' ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {Number(s.cantidad_disponible).toFixed(2)}
                    <span className="text-sm font-normal text-gray-400 ml-1">{unidad}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Mínimo: {Number(s.cantidad_minima).toFixed(2)} {unidad}
                  </p>
                </div>

                {/* Barra de nivel */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Nivel de stock</span>
                    <span>{status.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(status.pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{formatDateTime(s.ultima_actualizacion)}</p>
                  <button
                    onClick={() => { if (ing) openHistorial(ing) }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors"
                    title="Ver historial"
                  >
                    <History size={13} /> Historial
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal movimiento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento de stock" size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Ingrediente</label>
            <select value={form.ingrediente_id} onChange={(e) => setForm({ ...form, ingrediente_id: e.target.value })} className="form-select">
              {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tipo</label>
            <div className="flex gap-2">
              {(['entrada', 'salida'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, tipo: t })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize flex items-center justify-center gap-2
                    ${form.tipo === t
                      ? t === 'entrada' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {t === 'entrada' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">
              Cantidad ({ingredientes.find((i) => i.id === parseInt(form.ingrediente_id))?.unidad_medida ?? ''})
            </label>
            <input type="number" step="0.01" min="0.01" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="form-input" placeholder="0.00" />
          </div>
          <div>
            <label className="form-label">Notas (opcional)</label>
            <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="form-input" placeholder="Proveedor, referencia..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" className="text-white" /> : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal historial */}
      <Modal open={historialOpen} onClose={() => setHistorialOpen(false)} title={`Historial: ${historialIng?.nombre}`} size="md">
        {movimientos.length === 0 ? (
          <div className="flex justify-center py-8"><Spinner className="text-brand-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Fecha</th>
                <th className="text-center py-2 text-xs text-gray-500 font-medium">Tipo</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Cantidad</th>
                <th className="text-left py-2 text-xs text-gray-500 font-medium pl-4">Notas</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-500 text-xs">{formatDateTime(m.fecha)}</td>
                  <td className="py-2 text-center">
                    <Badge variant={m.tipo === 'entrada' ? 'success' : 'danger'}>
                      {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                    </Badge>
                  </td>
                  <td className="py-2 text-right font-mono font-semibold">{Number(m.cantidad).toFixed(4)}</td>
                  <td className="py-2 pl-4 text-gray-500 text-xs truncate max-w-40">{m.notas ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}
