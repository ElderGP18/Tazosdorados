import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getIngredientes, createIngrediente, updateIngrediente, deleteIngrediente } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { Ingrediente, IngredienteForm } from '../../types'

const UNIDADES = ['kg', 'g', 'L', 'ml', 'unidad', 'pieza', 'caja', 'bolsa']
const empty: IngredienteForm = { nombre: '', unidad_medida: 'kg', costo_unitario: '' }

export default function Ingredientes() {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Ingrediente | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Ingrediente | null>(null)
  const [form, setForm] = useState<IngredienteForm>(empty)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getIngredientes(false)
      setIngredientes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditTarget(null); setForm(empty); setModalOpen(true) }
  const openEdit = (i: Ingrediente) => {
    setEditTarget(i)
    setForm({ nombre: i.nombre, unidad_medida: i.unidad_medida, costo_unitario: String(i.costo_unitario) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      const payload = { nombre: form.nombre, unidad_medida: form.unidad_medida, costo_unitario: parseFloat(form.costo_unitario || '0') }
      if (editTarget) await updateIngrediente(editTarget.id, payload)
      else await createIngrediente(payload)
      toast.success(editTarget ? 'Ingrediente actualizado' : 'Ingrediente creado')
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
      await deleteIngrediente(deleteTarget.id)
      toast.success('Ingrediente desactivado')
      setConfirmOpen(false)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const filtered = ingredientes.filter((i) =>
    i.nombre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Ingredientes"
        description={`${ingredientes.filter((i) => i.activo).length} ingredientes activos`}
        action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo ingrediente</button>}
      />

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <input type="text" placeholder="Buscar ingrediente..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input max-w-xs" />
        </div>

        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">Nombre</th>
                  <th className="table-th">Unidad</th>
                  <th className="table-th">Costo unitario</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="table-tr">
                    <td className="table-td font-medium text-gray-900">{i.nombre}</td>
                    <td className="table-td"><Badge variant="gray">{i.unidad_medida}</Badge></td>
                    <td className="table-td">{formatCurrency(Number(i.costo_unitario))} / {i.unidad_medida}</td>
                    <td className="table-td"><Badge variant={i.activo ? 'success' : 'gray'}>{i.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => { setDeleteTarget(i); setConfirmOpen(true) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar ingrediente' : 'Nuevo ingrediente'}>
        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre *</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="form-input" placeholder="Ej: Carne de cerdo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Unidad de medida</label>
              <select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })} className="form-select">
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Costo unitario (GTQ)</label>
              <input type="number" step="0.01" min="0" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} className="form-input" placeholder="0.00" />
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
        message={`¿Desactivar el ingrediente "${deleteTarget?.nombre}"?`}
        loading={deleting}
      />
    </div>
  )
}
