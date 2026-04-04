import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { getStock } from '../../api/stock'
import { getIngredientes } from '../../api/ingredientes'
import { PageHeader } from '../../components/common/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/common/EmptyState'
import type { ItemMerma, Stock, Ingrediente } from '../../types'

function calcularMerma(stock: Stock[], ingredientes: Ingrediente[]): ItemMerma[] {
  return stock
    .filter((s) => s.cantidad_disponible < s.cantidad_minima)
    .map((s) => {
      const ing = ingredientes.find((i) => i.id === s.ingrediente_id)
      const porcentaje = s.cantidad_minima > 0
        ? Math.round((Number(s.cantidad_disponible) / Number(s.cantidad_minima)) * 100)
        : 0
      const nivel: ItemMerma['nivel'] =
        porcentaje <= 30 ? 'alto' : porcentaje <= 70 ? 'medio' : 'bajo'
      return {
        ingrediente_id: s.ingrediente_id,
        nombre: ing?.nombre ?? `#${s.ingrediente_id}`,
        unidad_medida: ing?.unidad_medida ?? '',
        cantidad_disponible: Number(s.cantidad_disponible),
        cantidad_minima: Number(s.cantidad_minima),
        porcentaje_restante: porcentaje,
        nivel,
      }
    })
    .sort((a, b) => a.porcentaje_restante - b.porcentaje_restante)
}

const nivelConfig = {
  alto:  { label: 'Riesgo alto',  variant: 'danger' as const,  bg: 'bg-red-50 border-red-200',   barColor: 'bg-red-500', icon: '🔴' },
  medio: { label: 'Riesgo medio', variant: 'warning' as const, bg: 'bg-yellow-50 border-yellow-200', barColor: 'bg-yellow-400', icon: '🟡' },
  bajo:  { label: 'Riesgo bajo',  variant: 'info' as const,    bg: 'bg-blue-50 border-blue-200', barColor: 'bg-blue-400', icon: '🔵' },
}

export default function Merma() {
  const [items, setItems] = useState<ItemMerma[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([getStock(), getIngredientes()])
      setItems(calcularMerma(s.data, i.data))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const alto = items.filter((i) => i.nivel === 'alto')
  const medio = items.filter((i) => i.nivel === 'medio')
  const bajo = items.filter((i) => i.nivel === 'bajo')

  return (
    <div>
      <PageHeader
        title="Control de merma"
        description="Ingredientes con riesgo de agotamiento"
        action={
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-400" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          message="Sin riesgo de merma"
          description="Todos los ingredientes están por encima del nivel mínimo configurado."
        />
      ) : (
        <div className="space-y-6">
          {/* Resumen con contadores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { nivel: 'alto', count: alto.length, label: 'Riesgo alto', bg: 'bg-red-50 border-red-300', text: 'text-red-700', sub: 'Acción inmediata' },
              { nivel: 'medio', count: medio.length, label: 'Riesgo medio', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', sub: 'Revisar hoy' },
              { nivel: 'bajo', count: bajo.length, label: 'Riesgo bajo', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', sub: 'Monitorear' },
            ]).map(({ nivel, count, label, bg, text, sub }) => (
              <div key={nivel} className={`rounded-xl border p-4 ${bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-3xl font-bold ${text}`}>{count}</p>
                    <p className={`text-sm font-semibold ${text}`}>{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                  <AlertTriangle size={28} className={`${text} opacity-40`} />
                </div>
              </div>
            ))}
          </div>

          {/* Secciones por nivel */}
          {([
            { nivel: 'alto', list: alto },
            { nivel: 'medio', list: medio },
            { nivel: 'bajo', list: bajo },
          ] as const).map(({ nivel, list }) => {
            if (list.length === 0) return null
            const cfg = nivelConfig[nivel]
            return (
              <div key={nivel} className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-inherit flex items-center gap-2">
                  <span>{cfg.icon}</span>
                  <h3 className="font-semibold text-gray-900">{cfg.label}</h3>
                  <span className="ml-auto text-sm text-gray-500">{list.length} ingrediente{list.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-white/50">
                  {list.map((item) => (
                    <div key={item.ingrediente_id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm">{item.nombre}</p>
                          <Badge variant={cfg.variant}>{item.porcentaje_restante}%</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200/70 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${cfg.barColor} transition-all`}
                              style={{ width: `${Math.min(item.porcentaje_restante, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-6 mt-1.5 text-xs text-gray-500">
                          <span>Actual: <span className="font-medium text-gray-700">{item.cantidad_disponible} {item.unidad_medida}</span></span>
                          <span>Mínimo: <span className="font-medium text-gray-700">{item.cantidad_minima} {item.unidad_medida}</span></span>
                          <span className="text-red-600 font-medium">
                            Faltante: {Math.max(0, item.cantidad_minima - item.cantidad_disponible).toFixed(2)} {item.unidad_medida}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
