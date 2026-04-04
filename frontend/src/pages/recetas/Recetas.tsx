import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProductos } from '../../api/productos'
import { getIngredientes, getRecetasPorProducto, createRecetaDetalle, deleteRecetaDetalle } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../api/client'
import type { Producto, Ingrediente, RecetaDetalle } from '../../types'

export default function Recetas() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [recetas, setRecetas] = useState<Record<number, RecetaDetalle[]>>({})
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingReceta, setLoadingReceta] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecetaDetalle | null>(null)
  const [form, setForm] = useState({ ingrediente_id: '', cantidad: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([getProductos(), getIngredientes()]).then(([p, i]) => {
      setProductos(p.data)
      setIngredientes(i.data)
      setLoading(false)
    })
  }, [])

  const toggleExpand = async (producto: Producto) => {
    const newExpanded = new Set(expanded)
    if (expanded.has(producto.id)) {
      newExpanded.delete(producto.id)
    } else {
      newExpanded.add(producto.id)
      if (!recetas[producto.id]) {
        setLoadingReceta(producto.id)
        try {
          const { data } = await getRecetasPorProducto(producto.id)
          setRecetas((prev) => ({ ...prev, [producto.id]: data }))
        } catch {
          setRecetas((prev) => ({ ...prev, [producto.id]: [] }))
        } finally {
          setLoadingReceta(null)
        }
      }
    }
    setExpanded(newExpanded)
  }

  const openAddIngrediente = (p: Producto) => {
    setSelectedProducto(p)
    setForm({ ingrediente_id: String(ingredientes[0]?.id ?? ''), cantidad: '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!selectedProducto || !form.ingrediente_id || !form.cantidad) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      await createRecetaDetalle({
        producto_id: selectedProducto.id,
        ingrediente_id: parseInt(form.ingrediente_id),
        cantidad: parseFloat(form.cantidad),
      })
      toast.success('Ingrediente agregado a la receta')
      setModalOpen(false)
      const { data } = await getRecetasPorProducto(selectedProducto.id)
      setRecetas((prev) => ({ ...prev, [selectedProducto.id]: data }))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !selectedProducto) return
    setDeleting(true)
    try {
      await deleteRecetaDetalle(deleteTarget.id)
      toast.success('Ingrediente eliminado de la receta')
      setConfirmOpen(false)
      const { data } = await getRecetasPorProducto(selectedProducto.id)
      setRecetas((prev) => ({ ...prev, [selectedProducto.id]: data }))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const getIngNombre = (id: number) => ingredientes.find((i) => i.id === id)?.nombre ?? `#${id}`
  const getIngUnidad = (id: number) => ingredientes.find((i) => i.id === id)?.unidad_medida ?? ''

  return (
    <div>
      <PageHeader title="Recetas" description="Ingredientes por producto" />

      {loading ? (
        <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {productos.map((producto) => (
            <div key={producto.id}>
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpand(producto)}
              >
                <div className="flex items-center gap-3">
                  {expanded.has(producto.id) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  <div>
                    <p className="font-medium text-gray-900">{producto.nombre}</p>
                    <p className="text-xs text-gray-400">${Number(producto.precio).toFixed(2)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openAddIngrediente(producto) }}
                  className="btn-ghost text-xs py-1 px-2 text-brand-600 hover:bg-brand-50"
                >
                  <Plus size={13} /> Agregar
                </button>
              </div>

              {expanded.has(producto.id) && (
                <div className="px-5 pb-4 bg-gray-50/50">
                  {loadingReceta === producto.id ? (
                    <div className="flex justify-center py-4"><Spinner size="sm" className="text-brand-400" /></div>
                  ) : !recetas[producto.id] || recetas[producto.id].length === 0 ? (
                    <p className="text-sm text-gray-400 py-3 text-center">Sin ingredientes en la receta</p>
                  ) : (
                    <table className="w-full text-sm mt-2">
                      <thead><tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-xs text-gray-500 font-medium pl-4">Ingrediente</th>
                        <th className="text-right py-2 text-xs text-gray-500 font-medium">Cantidad</th>
                        <th className="text-right py-2 text-xs text-gray-500 font-medium">Unidad</th>
                        <th className="w-10"></th>
                      </tr></thead>
                      <tbody>
                        {recetas[producto.id].map((r) => (
                          <tr key={r.id} className="border-b border-gray-100">
                            <td className="py-2 pl-4 text-gray-700">{getIngNombre(r.ingrediente_id)}</td>
                            <td className="py-2 text-right font-mono text-gray-900">{r.cantidad}</td>
                            <td className="py-2 text-right text-gray-500">{getIngUnidad(r.ingrediente_id)}</td>
                            <td className="py-2 text-center">
                              <button onClick={() => { setSelectedProducto(producto); setDeleteTarget(r); setConfirmOpen(true) }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Receta: ${selectedProducto?.nombre}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Ingrediente</label>
            <select value={form.ingrediente_id} onChange={(e) => setForm({ ...form, ingrediente_id: e.target.value })} className="form-select">
              {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">
              Cantidad ({ingredientes.find((i) => i.id === parseInt(form.ingrediente_id))?.unidad_medida ?? 'unidad'} por porción)
            </label>
            <input type="number" step="0.001" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} className="form-input" placeholder="0.000" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" className="text-white" /> : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        message="¿Eliminar este ingrediente de la receta?"
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
