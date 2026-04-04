import { PackageSearch } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  message = 'Sin resultados',
  description = 'No hay datos disponibles para mostrar.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <PackageSearch size={24} className="text-gray-400" />
      </div>
      <p className="text-gray-700 font-medium">{message}</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
