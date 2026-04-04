import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProductos } from '../../api/productos'
import {
  getIngredientes, getRecetasPorProducto,
  createRecetaDetalle, updateRecetaDetalle, deleteRecetaDetalle,
} from '../../api/ingredientes'
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

  // Modal agregar
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [form, setForm] = useState({ ingrediente_id: '', cantidad: '' })
  const [saving, setSaving] = useState(false)

  // Modal editar cantidad
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RecetaDetalle | null>(null)
  const [editCantidad, setEditCantidad] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Confirmar eliminar
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RecetaDetalle | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([getProductos(), getIngredientes()]).then(([p, i]) => {
      setProductos(p.data)
      setIngredientes(i.data)
      setLoading(false)
    })
  }, [])

  const reloadReceta = async (productoId: number) => {
    const { data } = await getRecetasPorProducto(productoId)
    setRecetas((prev) => ({ ...prev, [productoId]: data }))
  }

  const toggleExpand = async (producto: Producto) => {
    const next = new Set(expanded)
    if (expanded.has(producto.id)) {
      next.delete(producto.id)
    } else {
      next.add(producto.id)
      if (!recetas[producto.id]) {
        setLoadingReceta(producto.id)
        try { await reloadReceta(producto.id) }
        catch { setRecetas((prev) => ({ ...prev, [producto.id]: [] })) }
        finally { setLoadingReceta(null) }
      }
    }
    setExpanded(next)
  }

  // ── Agregar ingrediente ──────────────────────────────
  const openAgregar = (p: Producto) => {
    setSelectedProducto(p)
    setForm({ ingrediente_id: String(ingredientes[0]?.id ?? ''), cantidad: '' })
    setModalOpen(true)
  }

  const handleAgregar = async () => {
    if (!selectedProducto || !form.ingrediente_id || !form.cantidad) {
      toast.error('Completa todos los campos'); return
    }
    setSaving(true)
    try {
      await createRecetaDetalle({
        producto_id: selectedProducto.id,
        ingrediente_id: parseInt(form.ingrediente_id),
        cantidad: parseFloat(form.cantidad),
      })
      toast.success('Ingrediente agregado')
      setModalOpen(false)
      await reloadReceta(selectedProducto.id)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  // ── Editar cantidad ──────────────────────────────────
  const openEditar = (producto: Producto, r: RecetaDetalle) => {
    setSelectedProducto(producto)
    setEditTarget(r)
    setEditCantidad(String(r.cantidad))
    setEditOpen(true)
  }

  const handleEditar = async () => {
    if (!editTarget || !selectedProducto || !editCantidad) {
      toast.error('Ingresa una cantidad'); return
    }
    const val = parseFloat(editCantidad)
    if (isNaN(val) || val <= 0) { toast.error('Cantidad inválida'); return }
    setEditSaving(true)
    try {
      await updateRecetaDetalle(editTarget.id, val)
      toast.success('Cantidad actualizada')
      setEditOpen(false)
      await reloadReceta(selectedProducto.id)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setEditSaving(false) }
  }

  // ── Eliminar ─────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || !selectedProducto) return
    setDeleting(true)
    try {
      await deleteRecetaDetalle(deleteTarget.id)
      toast.success('Ingrediente eliminado de la receta')
      setConfirmOpen(false)
      await reloadReceta(selectedProducto.id)
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setDeleting(false) }
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
                  {expanded.has(producto.id)
                    ? <ChevronDown size={16} className="text-gray-400" />
                    : <ChevronRight size={16} className="text-gray-400" />}
                  <div>
                    <p className="font-medium text-gray-900">{producto.nombre}</p>
                    <p className="text-xs text-gray-400">Q {Number(producto.precio).toFixed(2)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); openAgregar(producto) }}
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
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium pl-4">Ingrediente</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Cantidad</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Unidad</th>
                          <th className="w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {recetas[producto.id].map((r) => (
                          <tr key={r.id} className="border-b border-gray-100 group">
                            <td className="py-2 pl-4 text-gray-700">{getIngNombre(r.ingrediente_id)}</td>
                            <td className="py-2 text-right font-mono text-gray-900">{r.cantidad}</td>
                            <td className="py-2 text-right text-gray-500">{getIngUnidad(r.ingrediente_id)}</td>
                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditar(producto, r)}
                                  className="text-gray-400 hover:text-brand-600 transition-colors p-1"
                                  title="Editar cantidad"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => { setSelectedProducto(producto); setDeleteTarget(r); setConfirmOpen(true) }}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
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

      {/* Modal: agregar ingrediente */}
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
            <input
              type="number" step="0.001" min="0"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="form-input" placeholder="0.000"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleAgregar} className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" className="text-white" /> : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: editar cantidad */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cantidad" size="sm">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <p className="text-gray-500">Ingrediente</p>
            <p className="font-semibold text-gray-900">{editTarget ? getIngNombre(editTarget.ingrediente_id) : ''}</p>
          </div>
          <div>
            <label className="form-label">
              Nueva cantidad ({editTarget ? getIngUnidad(editTarget.ingrediente_id) : ''} por porción)
            </label>
            <input
              type="number" step="0.001" min="0.001"
              value={editCantidad}
              onChange={(e) => setEditCantidad(e.target.value)}
              className="form-input"
              placeholder="0.000"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleEditar} className="btn-primary" disabled={editSaving}>
              {editSaving ? <Spinner size="sm" className="text-white" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        message={`¿Eliminar ${deleteTarget ? getIngNombre(deleteTarget.ingrediente_id) : 'este ingrediente'} de la receta?`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
