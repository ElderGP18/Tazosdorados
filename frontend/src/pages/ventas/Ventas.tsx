import { useEffect, useRef, useState } from 'react'
import { Plus, Search, ChevronDown, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { subDays, startOfWeek, startOfMonth } from 'date-fns'
import { today as gtToday, toDateInput } from '../../utils/format'
import { getVentas, createVenta } from '../../api/ventas'
import { getProductos } from '../../api/productos'
import { verificarStockVenta, type AdvertenciaStock } from '../../api/stock'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { Venta, Producto } from '../../types'

type Filtro = 'hoy' | 'semana' | 'mes' | 'personalizado'

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia']

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('hoy')
  const [fechaDesde, setFechaDesde] = useState(gtToday())
  const [fechaHasta, setFechaHasta] = useState(gtToday())
  const [detailOpen, setDetailOpen] = useState<Venta | null>(null)

  // Form state
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<Array<{ producto_id: number; cantidad: number; precio_unitario: number }>>([])
  const [advertencias, setAdvertencias] = useState<AdvertenciaStock[]>([])
  const verificarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVentas = async (desde: string, hasta: string) => {
    setLoading(true)
    try {
      const { data } = await getVentas({ fecha_desde: desde, fecha_hasta: hasta, limit: 200 })
      setVentas(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getProductos().then(({ data }) => setProductos(data))
  }, [])

  useEffect(() => {
    const today = gtToday()
    if (filtro === 'hoy') {
      setFechaDesde(today); setFechaHasta(today)
      fetchVentas(today, today)
    } else if (filtro === 'semana') {
      const desde = toDateInput(startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString())
      setFechaDesde(desde); setFechaHasta(today)
      fetchVentas(desde, today)
    } else if (filtro === 'mes') {
      const desde = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      setFechaDesde(desde); setFechaHasta(today)
      fetchVentas(desde, today)
    }
  }, [filtro])

  const applyPersonalizado = () => fetchVentas(fechaDesde, fechaHasta)

  const addItem = () => {
    if (productos.length === 0) return
    const p = productos[0]
    setItems((prev) => [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: Number(p.precio) }])
  }

  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'producto_id') {
        const p = productos.find((pr) => pr.id === Number(value))
        if (p) updated.precio_unitario = Number(p.precio)
      }
      return updated
    }))
  }

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  // Verificar stock cada vez que cambian los items (debounce 400ms)
  useEffect(() => {
    if (verificarTimer.current) clearTimeout(verificarTimer.current)
    if (items.length === 0) { setAdvertencias([]); return }
    verificarTimer.current = setTimeout(async () => {
      try {
        const { data } = await verificarStockVenta(
          items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
        )
        setAdvertencias(data.advertencias)
      } catch {
        setAdvertencias([])
      }
    }, 400)
  }, [items])

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      await createVenta({ metodo_pago: metodoPago, notas, detalles: items })
      toast.success('Venta registrada')
      setModalOpen(false)
      setItems([]); setNotas(''); setMetodoPago('efectivo'); setAdvertencias([])
      fetchVentas(fechaDesde, fechaHasta)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const totalFiltrado = ventas.reduce((s, v) => s + Number(v.total), 0)

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Registro y consulta de ventas"
        action={
          <button onClick={() => { setModalOpen(true); setItems([]); setAdvertencias([]) }} className="btn-primary">
            <Plus size={16} /> Nueva venta
          </button>
        }
      />

      {/* Filtros */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['hoy', 'semana', 'mes', 'personalizado'] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  filtro === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filtro === 'personalizado' && (
            <div className="flex items-center gap-2">
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="form-input w-40" />
              <span className="text-gray-400">—</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="form-input w-40" />
              <button onClick={applyPersonalizado} className="btn-secondary">
                <Search size={14} /> Buscar
              </button>
            </div>
          )}
          <div className="ml-auto text-sm font-semibold text-gray-700">
            Total: {formatCurrency(totalFiltrado)}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-14"><Spinner className="text-brand-400" /></div>
        ) : ventas.length === 0 ? (
          <p className="text-center py-14 text-gray-400">Sin ventas en el período seleccionado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Fecha y hora</th>
                  <th className="table-th">Items</th>
                  <th className="table-th">Pago</th>
                  <th className="table-th">Total</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="table-tr">
                    <td className="table-td text-gray-400 font-mono">#{v.id}</td>
                    <td className="table-td">{formatDateTime(v.fecha)}</td>
                    <td className="table-td">{v.detalles?.length ?? '—'} productos</td>
                    <td className="table-td">
                      <Badge variant="gray">{v.metodo_pago}</Badge>
                    </td>
                    <td className="table-td font-semibold text-gray-900">{formatCurrency(Number(v.total))}</td>
                    <td className="table-td">
                      <button
                        onClick={() => setDetailOpen(v)}
                        className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1"
                      >
                        Ver <ChevronDown size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva venta */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar venta" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="form-select">
                {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Notas (opcional)</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Comentario..." className="form-input" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label !mb-0">Productos</label>
              <button onClick={addItem} className="btn-ghost text-xs py-1 px-2">
                <Plus size={13} /> Agregar
              </button>
            </div>
            {items.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg py-6 text-center text-sm text-gray-400">
                Agrega productos a la venta
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={item.producto_id}
                      onChange={(e) => updateItem(idx, 'producto_id', Number(e.target.value))}
                      className="form-select col-span-5"
                    >
                      {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <input
                      type="number" min={1} value={item.cantidad}
                      onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))}
                      className="form-input col-span-2 text-center"
                    />
                    <input
                      type="number" step="0.01" value={item.precio_unitario}
                      onChange={(e) => updateItem(idx, 'precio_unitario', Number(e.target.value))}
                      className="form-input col-span-3"
                    />
                    <span className="col-span-1 text-xs text-gray-500 text-right">
                      Q{(item.cantidad * item.precio_unitario).toFixed(0)}
                    </span>
                    <button onClick={() => removeItem(idx)} className="col-span-1 text-red-400 hover:text-red-600 text-xs text-center">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advertencias de stock insuficiente */}
          {advertencias.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={15} className="text-orange-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-orange-800">Stock insuficiente para esta venta</p>
              </div>
              {advertencias.map((a) => (
                <div key={a.ingrediente} className="flex items-center justify-between text-xs text-orange-700 bg-orange-100 rounded-lg px-3 py-1.5">
                  <span className="font-medium">{a.ingrediente}</span>
                  <span>
                    Disponible: <span className="font-semibold">{a.disponible} {a.unidad_medida}</span>
                    {' · '}
                    Necesario: <span className="font-semibold">{a.necesario} {a.unidad_medida}</span>
                    {' · '}
                    <span className="text-red-600 font-semibold">Falta: {a.faltante} {a.unidad_medida}</span>
                  </span>
                </div>
              ))}
              <p className="text-xs text-orange-600 pt-0.5">Puedes continuar de todas formas o revisar el stock primero.</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-lg font-bold text-gray-900">Total: {formatCurrency(total)}</span>
            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? <Spinner size="sm" className="text-white" /> : 'Guardar venta'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal detalle */}
      {detailOpen && (
        <Modal open={!!detailOpen} onClose={() => setDetailOpen(null)} title={`Venta #${detailOpen.id}`} size="md">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500">Fecha</p><p className="font-medium">{formatDateTime(detailOpen.fecha)}</p></div>
              <div><p className="text-gray-500">Pago</p><p className="font-medium capitalize">{detailOpen.metodo_pago}</p></div>
            </div>
            {detailOpen.notas && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{detailOpen.notas}</p>}
            <table className="w-full text-sm mt-3">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Producto</th>
                <th className="text-center py-2 text-gray-500 font-medium">Cant.</th>
                <th className="text-right py-2 text-gray-500 font-medium">Subtotal</th>
              </tr></thead>
              <tbody>
                {detailOpen.detalles?.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">Prod. #{d.producto_id}</td>
                    <td className="py-2 text-center">{d.cantidad}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(Number(d.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end pt-2">
              <span className="text-lg font-bold text-gray-900">Total: {formatCurrency(Number(detailOpen.total))}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
