import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getProductos, createProducto, updateProducto, deleteProducto, getCategorias } from '../../api/productos'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency, formatDate } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { Producto, ProductoForm } from '../../types'

const empty: ProductoForm = { nombre: '', descripcion: '', precio: '', categoria_id: '' }

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Producto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null)
  const [form, setForm] = useState<ProductoForm>(empty)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([getProductos(false), getCategorias()])
      setProductos(p.data)
      setCategorias(c.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditTarget(null); setForm(empty); setModalOpen(true) }
  const openEdit = (p: Producto) => {
    setEditTarget(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? '', precio: String(p.precio), categoria_id: String(p.categoria_id ?? '') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre || !form.precio) { toast.error('Nombre y precio son requeridos'); return }
    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        precio: parseFloat(form.precio),
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : undefined,
      }
      if (editTarget) await updateProducto(editTarget.id, payload)
      else await createProducto(payload)
      toast.success(editTarget ? 'Producto actualizado' : 'Producto creado')
      setModalOpen(false)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProducto(deleteTarget.id)
      toast.success('Producto desactivado')
      setConfirmOpen(false)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const filtered = productos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const getCatNombre = (id?: number) => categorias.find((c) => c.id === id)?.nombre ?? '—'

  return (
    <div>
      <PageHeader
        title="Productos"
        description={`${productos.filter((p) => p.activo).length} productos activos`}
        action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo producto</button>}
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <input
            type="text" placeholder="Buscar producto..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="form-input max-w-xs"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Nombre</th>
                  <th className="table-th">Categoría</th>
                  <th className="table-th">Precio</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Creado</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="table-tr">
                    <td className="table-td">
                      <div>
                        <p className="font-medium text-gray-900">{p.nombre}</p>
                        {p.descripcion && <p className="text-xs text-gray-400 truncate max-w-xs">{p.descripcion}</p>}
                      </div>
                    </td>
                    <td className="table-td">{getCatNombre(p.categoria_id)}</td>
                    <td className="table-td font-semibold">{formatCurrency(Number(p.precio))}</td>
                    <td className="table-td">
                      <Badge variant={p.activo ? 'success' : 'gray'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="table-td text-gray-400">{formatDate(p.created_at)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { setDeleteTarget(p); setConfirmOpen(true) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar producto' : 'Nuevo producto'}>
        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre *</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="form-input" placeholder="Ej: Taco al Pastor" />
          </div>
          <div>
            <label className="form-label">Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="form-input" rows={2} placeholder="Descripción breve..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Precio (MXN) *</label>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className="form-input" placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="form-select">
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" className="text-white" /> : editTarget ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        message={`¿Desactivar el producto "${deleteTarget?.nombre}"?`}
        loading={deleting}
      />
    </div>
  )
}
