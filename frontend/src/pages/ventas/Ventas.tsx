import { useEffect, useRef, useState } from 'react'
import { Plus, Search, ChevronDown, AlertTriangle, Minus, Trash2, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { subDays, startOfWeek, startOfMonth } from 'date-fns'
import { today as gtToday, toDateInput } from '../../utils/format'
import { getVentas, createVenta } from '../../api/ventas'
import { getProductos, getCategorias } from '../../api/productos'
import { verificarStockVenta, type AdvertenciaStock } from '../../api/stock'
import { PageHeader } from '../../components/common/PageHeader'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { getErrorMessage } from '../../api/client'
import type { Venta, Producto } from '../../types'

type Filtro = 'hoy' | 'semana' | 'mes' | 'personalizado'
type CartItem = { producto_id: number; cantidad: number; precio_unitario: number }

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia']
const CAT_ORDER = ['Tacos', 'Quesadillas', 'Bebidas', 'Extras']

// Guarniciones automáticas (cantidad = suma de porciones principales)
const GARNISH_NAMES = ['Guacamol', 'Salsa Roja', 'Salsa Verde', 'Limón', 'Picante']
const isMain = (nombre: string) => nombre.startsWith('Taco ') || nombre.startsWith('Quesadilla ')
const isGarnishName = (nombre: string) => GARNISH_NAMES.includes(nombre)

// Recalcula guarniciones: qty = suma de todas las porciones principales
const syncGarnishes = (cart: CartItem[], allProducts: Producto[]): CartItem[] => {
  const mainQty = cart
    .filter((i) => {
      const p = allProducts.find((p) => p.id === i.producto_id)
      return p && isMain(p.nombre)
    })
    .reduce((sum, i) => sum + i.cantidad, 0)

  // Quitar guarniciones existentes del carrito
  const withoutGarnish = cart.filter((i) => {
    const p = allProducts.find((p) => p.id === i.producto_id)
    return !p || !isGarnishName(p.nombre)
  })

  if (mainQty === 0) return withoutGarnish

  // Agregar guarniciones con la cantidad correcta
  const garnishes = allProducts.filter((p) => isGarnishName(p.nombre))
  const garnishItems: CartItem[] = garnishes.map((g) => ({
    producto_id: g.id,
    cantidad: mainQty,
    precio_unitario: 0,
  }))

  return [...withoutGarnish, ...garnishItems]
}

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [catMap, setCatMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('hoy')
  const [fechaDesde, setFechaDesde] = useState(gtToday())
  const [fechaHasta, setFechaHasta] = useState(gtToday())
  const [detailOpen, setDetailOpen] = useState<Venta | null>(null)
  const [activeCat, setActiveCat] = useState<string>('Tacos')
  const [mobileTab, setMobileTab] = useState<'productos' | 'orden'>('productos')

  // Carrito
  const [items, setItems] = useState<CartItem[]>([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notas, setNotas] = useState('')
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
    Promise.all([getProductos(), getCategorias()]).then(([pRes, cRes]) => {
      setProductos(pRes.data)
      const map: Record<number, string> = {}
      cRes.data.forEach((c) => { map[c.id] = c.nombre })
      setCatMap(map)
    })
  }, [])

  useEffect(() => {
    const today = gtToday()
    if (filtro === 'hoy') {
      setFechaDesde(today); setFechaHasta(today); fetchVentas(today, today)
    } else if (filtro === 'semana') {
      const desde = toDateInput(startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString())
      setFechaDesde(desde); setFechaHasta(today); fetchVentas(desde, today)
    } else if (filtro === 'mes') {
      const desde = toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      setFechaDesde(desde); setFechaHasta(today); fetchVentas(desde, today)
    }
  }, [filtro])

  const applyPersonalizado = () => fetchVentas(fechaDesde, fechaHasta)

  // Agregar producto al carrito y recalcular guarniciones
  const addToCart = (product: Producto) => {
    // No permitir agregar guarniciones manualmente (se manejan solas)
    if (isGarnishName(product.nombre)) return
    setItems((prev) => {
      const next = [...prev]
      const idx = next.findIndex((i) => i.producto_id === product.id)
      if (idx >= 0) {
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
      } else {
        next.push({ producto_id: product.id, cantidad: 1, precio_unitario: Number(product.precio) })
      }
      return syncGarnishes(next, productos)
    })
  }

  const updateQty = (producto_id: number, delta: number) => {
    setItems((prev) => {
      const prod = productos.find((p) => p.id === producto_id)
      // No editar cantidad de guarniciones manualmente
      if (prod && isGarnishName(prod.nombre)) return prev
      const next = prev
        .map((i) => i.producto_id === producto_id ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
      return syncGarnishes(next, productos)
    })
  }

  const removeItem = (producto_id: number) => {
    setItems((prev) => {
      const prod = productos.find((p) => p.id === producto_id)
      if (prod && isGarnishName(prod.nombre)) return prev
      const next = prev.filter((i) => i.producto_id !== producto_id)
      return syncGarnishes(next, productos)
    })
  }

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  // Verificar stock (debounce)
  useEffect(() => {
    if (verificarTimer.current) clearTimeout(verificarTimer.current)
    if (items.length === 0) { setAdvertencias([]); return }
    verificarTimer.current = setTimeout(async () => {
      try {
        const { data } = await verificarStockVenta(
          items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }))
        )
        setAdvertencias(data.advertencias)
      } catch { setAdvertencias([]) }
    }, 400)
  }, [items])

  const openModal = () => {
    setItems([]); setNotas(''); setMetodoPago('efectivo')
    setAdvertencias([]); setActiveCat('Tacos'); setMobileTab('productos'); setModalOpen(true)
  }

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      await createVenta({ metodo_pago: metodoPago, notas, detalles: items })
      toast.success('Venta registrada')
      setModalOpen(false)
      fetchVentas(fechaDesde, fechaHasta)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const totalFiltrado = ventas.reduce((s, v) => s + Number(v.total), 0)

  // Productos por categoría activa
  const prodsByCat = productos.filter(
    (p) => catMap[p.categoria_id ?? 0] === activeCat
  )

  const nombreProd = (id: number) => productos.find((p) => p.id === id)?.nombre ?? `Prod. #${id}`

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Registro y consulta de ventas"
        action={
          <button onClick={openModal} className="btn-primary">
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
                    <td className="table-td"><Badge variant="gray">{v.metodo_pago}</Badge></td>
                    <td className="table-td font-semibold text-gray-900">{formatCurrency(Number(v.total))}</td>
                    <td className="table-td">
                      <button onClick={() => setDetailOpen(v)} className="text-brand-600 hover:text-brand-700 text-xs font-medium flex items-center gap-1">
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

      {/* ── Modal nueva venta (POS) ─────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva venta" size="xl">
        <div className="flex flex-col gap-3">

          {/* Tabs mobile: Productos / Orden */}
          <div className="flex sm:hidden gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMobileTab('productos')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${mobileTab === 'productos' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Productos
            </button>
            <button
              onClick={() => setMobileTab('orden')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors relative ${mobileTab === 'orden' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Orden
              {items.filter(i => !isGarnishName(productos.find(p => p.id === i.producto_id)?.nombre ?? '')).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {items.filter(i => !isGarnishName(productos.find(p => p.id === i.producto_id)?.nombre ?? '')).length}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4" style={{ minHeight: '400px' }}>

            {/* Selector de productos */}
            <div className={`flex-1 flex flex-col gap-3 ${mobileTab === 'orden' ? 'hidden sm:flex' : 'flex'}`}>
              {/* Tabs categoría */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {CAT_ORDER.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      activeCat === cat ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: '340px' }}>
                {prodsByCat.map((p) => {
                  const inCart = items.find((i) => i.producto_id === p.id)
                  const garnish = isGarnishName(p.nombre)
                  return (
                    <button
                      key={p.id}
                      onClick={() => { addToCart(p); setMobileTab('orden') }}
                      className={`relative text-left rounded-xl border px-3 py-3 transition-all hover:shadow-md active:scale-95 ${
                        inCart
                          ? 'border-brand-400 bg-brand-50 shadow-sm'
                          : garnish
                          ? 'border-green-200 bg-green-50 hover:border-green-400'
                          : 'border-gray-200 bg-white hover:border-brand-300'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {inCart.cantidad}
                        </span>
                      )}
                      <p className={`text-sm font-semibold leading-tight pr-6 ${garnish ? 'text-green-800' : 'text-gray-800'}`}>
                        {p.nombre}
                      </p>
                      <p className={`text-xs mt-0.5 font-medium ${garnish || Number(p.precio) === 0 ? 'text-green-600' : 'text-brand-600'}`}>
                        {Number(p.precio) === 0 ? 'Gratis' : formatCurrency(Number(p.precio))}
                      </p>
                      {isMain(p.nombre) && (
                        <p className="text-xs text-gray-400 mt-0.5">+ guarniciones auto</p>
                      )}
                    </button>
                  )
                })}
                {prodsByCat.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-gray-400 py-8">Sin productos en esta categoría</p>
                )}
              </div>
            </div>

            {/* Carrito */}
            <div className={`sm:w-64 flex flex-col gap-3 ${mobileTab === 'productos' ? 'hidden sm:flex' : 'flex'}`}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={15} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Orden</span>
                {items.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{items.length} items</span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center py-8">
                  <p className="text-sm text-gray-400 text-center px-4">Toca un producto para agregarlo</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5" style={{ maxHeight: '260px' }}>
                  {items.map((item) => {
                    const prod = productos.find((p) => p.id === item.producto_id)
                    const garnish = prod ? isGarnishName(prod.nombre) : false
                    return (
                      <div
                        key={item.producto_id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                          garnish ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{nombreProd(item.producto_id)}</p>
                          <p className={`text-xs ${garnish ? 'text-green-600' : 'text-brand-600'}`}>
                            {item.precio_unitario === 0 ? 'Gratis' : formatCurrency(item.precio_unitario)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.producto_id, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-semibold w-5 text-center">{item.cantidad}</span>
                          <button onClick={() => updateQty(item.producto_id, 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                            <Plus size={10} />
                          </button>
                          <button onClick={() => removeItem(item.producto_id)} className="w-6 h-6 rounded-full text-red-400 hover:text-red-600 flex items-center justify-center ml-0.5">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div>
                <label className="form-label text-xs">Método de pago</label>
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="form-select text-sm">
                  {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label text-xs">Notas</label>
                <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Comentario..." className="form-input text-sm" />
              </div>
            </div>
          </div>

          {/* Advertencias */}
          {advertencias.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-orange-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-orange-800">Stock insuficiente</p>
              </div>
              {advertencias.map((a) => (
                <div key={a.ingrediente} className="flex flex-wrap items-center justify-between text-xs text-orange-700 bg-orange-100 rounded px-2 py-1 gap-1">
                  <span className="font-medium">{a.ingrediente}</span>
                  <span>Disp: {a.disponible} · Need: {a.necesario} · <span className="text-red-600 font-semibold">Falta: {a.faltante}</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xl font-bold text-gray-900">Total: {formatCurrency(total)}</span>
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving || items.length === 0}>
                {saving ? <Spinner size="sm" className="text-white" /> : 'Guardar'}
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
                    <td className="py-2 text-gray-700">{nombreProd(d.producto_id)}</td>
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
