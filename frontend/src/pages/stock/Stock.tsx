import { useEffect, useState } from 'react'
import { Plus, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStock, registrarMovimiento, getMovimientos } from '../../api/stock'
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
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialIng, setHistorialIng] = useState<Ingrediente | null>(null)
  const [form, setForm] = useState({ ingrediente_id: '', tipo: 'entrada' as 'entrada' | 'salida', cantidad: '', notas: '' })

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

  const getStockStatus = (s: StockType) => {
    if (s.cantidad_disponible <= 0) return { label: 'Sin stock', variant: 'danger' as const }
    if (s.cantidad_disponible < s.cantidad_minima) return { label: 'Bajo mínimo', variant: 'warning' as const }
    return { label: 'Normal', variant: 'success' as const }
  }

  const alertas = stock.filter((s) => s.cantidad_disponible < s.cantidad_minima)

  return (
    <div>
      <PageHeader
        title="Stock"
        description={alertas.length > 0 ? `⚠️ ${alertas.length} ingredientes bajo mínimo` : 'Inventario en orden'}
        action={
          <button onClick={() => { setModalOpen(true); setForm({ ingrediente_id: String(ingredientes[0]?.id ?? ''), tipo: 'entrada', cantidad: '', notas: '' }) }} className="btn-primary">
            <Plus size={16} /> Registrar movimiento
          </button>
        }
      />

      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Ingredientes bajo nivel mínimo</p>
            <p className="text-sm text-red-600 mt-1">{alertas.map((a) => getIngNombre(a.ingrediente_id)).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Ingrediente</th>
                  <th className="table-th text-right">Disponible</th>
                  <th className="table-th text-right">Mínimo</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Última actualización</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => {
                  const status = getStockStatus(s)
                  return (
                    <tr key={s.id} className={`table-tr ${s.cantidad_disponible < s.cantidad_minima ? 'bg-red-50/30' : ''}`}>
                      <td className="table-td font-medium text-gray-900">{getIngNombre(s.ingrediente_id)}</td>
                      <td className="table-td text-right font-mono font-semibold">
                        {s.cantidad_disponible} {getIngUnidad(s.ingrediente_id)}
                      </td>
                      <td className="table-td text-right font-mono text-gray-500">
                        {s.cantidad_minima} {getIngUnidad(s.ingrediente_id)}
                      </td>
                      <td className="table-td"><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td className="table-td text-gray-400 text-xs">{formatDateTime(s.ultima_actualizacion)}</td>
                      <td className="table-td">
                        <button
                          onClick={() => { const ing = ingredientes.find((i) => i.id === s.ingrediente_id); if (ing) openHistorial(ing) }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                          title="Ver historial"
                        >
                          <History size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal movimiento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar movimiento de stock" size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Ingrediente</label>
            <select value={form.ingrediente_id} onChange={(e) => setForm({ ...form, ingrediente_id: e.target.value })} className="form-select">
              {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tipo</label>
              <div className="flex gap-2">
                {(['entrada', 'salida'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, tipo: t })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${form.tipo === t ? t === 'entrada' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
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
          <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs text-gray-500 font-medium">Fecha</th>
              <th className="text-center py-2 text-xs text-gray-500 font-medium">Tipo</th>
              <th className="text-right py-2 text-xs text-gray-500 font-medium">Cantidad</th>
              <th className="text-left py-2 text-xs text-gray-500 font-medium pl-4">Notas</th>
            </tr></thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-500 text-xs">{formatDateTime(m.fecha)}</td>
                  <td className="py-2 text-center">
                    <Badge variant={m.tipo === 'entrada' ? 'success' : 'danger'}>{m.tipo}</Badge>
                  </td>
                  <td className="py-2 text-right font-mono font-semibold">{m.cantidad}</td>
                  <td className="py-2 pl-4 text-gray-500 text-xs truncate max-w-32">{m.notas ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}
