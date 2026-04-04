import { Bell, Menu } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useLocation } from 'react-router-dom'

interface HeaderProps {
  onMenuToggle: () => void
}

const routeNames: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/ventas':          'Ventas',
  '/productos':       'Productos',
  '/ingredientes':    'Ingredientes',
  '/recetas':         'Recetas',
  '/stock':           'Stock',
  '/predicciones':    'Predicciones',
  '/recomendaciones': 'Recomendaciones de compra',
  '/merma':           'Control de merma',
  '/reportes':        'Reportes',
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  const pageName = routeNames[location.pathname] ?? 'Tazos Dorados'
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-semibold text-gray-900 text-base leading-tight">{pageName}</h1>
          <p className="text-xs text-gray-400 capitalize">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">{user?.nombre}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
