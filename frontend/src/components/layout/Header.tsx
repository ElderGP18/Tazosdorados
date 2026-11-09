import { Menu } from 'lucide-react'
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
  '/movimientos':     'Movimientos',
  '/predicciones':    'Predicciones',
  '/recomendaciones': 'Qué comprar',
  '/merma':           'Control de merma',
  '/reportes':        'Reportes',
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuthStore()
  const location = useLocation()
  const pageName = routeNames[location.pathname] ?? 'Tazos Dorados'
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <Menu size={20} />
        </button>
        {/* Logo pequeño en mobile */}
        <img
          src="/logo.jpg"
          alt=""
          className="lg:hidden w-9 h-9 rounded-full ring-2 ring-brand-300 object-cover"
        />
        <div>
          <h1 className="font-display font-bold text-gray-900 text-base leading-tight">{pageName}</h1>
          <p className="text-xs text-gray-400 capitalize">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 pl-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-700 leading-tight">{user?.nombre}</p>
            <p className="text-xs text-brand-500 font-medium uppercase tracking-wider">{user?.rol}</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-brand-400 blur opacity-40 rounded-full" />
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white">
              {user?.nombre?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
