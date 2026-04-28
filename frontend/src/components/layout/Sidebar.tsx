import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Layers, BookOpen,
  Archive, TrendingUp, ShoppingBag, AlertTriangle, BarChart2,
  LogOut, ChevronLeft, ChevronRight, Flame, ArrowLeftRight, X,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onClose?: () => void
}

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard',       icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/ventas',          icon: <ShoppingCart size={18} />,    label: 'Ventas' },
  { to: '/stock',           icon: <Archive size={18} />,         label: 'Stock' },
  { to: '/movimientos',     icon: <ArrowLeftRight size={18} />,  label: 'Movimientos' },
  { to: '/merma',           icon: <AlertTriangle size={18} />,   label: 'Merma' },
  { to: '/productos',       icon: <Package size={18} />,         label: 'Productos',    adminOnly: true },
  { to: '/ingredientes',    icon: <Layers size={18} />,          label: 'Ingredientes', adminOnly: true },
  { to: '/recetas',         icon: <BookOpen size={18} />,        label: 'Recetas',      adminOnly: true },
  { to: '/predicciones',    icon: <TrendingUp size={18} />,      label: 'Predicciones', adminOnly: true },
  { to: '/recomendaciones', icon: <ShoppingBag size={18} />,     label: 'Compras',      adminOnly: true },
  { to: '/reportes',        icon: <BarChart2 size={18} />,       label: 'Reportes',     adminOnly: true },
]

const rolLabel: Record<string, string> = {
  admin:    'Administrador',
  vendedor: 'Vendedor',
  cajero:   'Vendedor',
}

export function Sidebar({ collapsed, onToggle, onClose }: SidebarProps) {
  const { user, clearAuth, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const admin = isAdmin()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const visible = navItems.filter((item) => !item.adminOnly || admin)

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-gray-900 z-30 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <Flame size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1">
            <p className="text-white font-bold text-sm leading-tight">Tazos</p>
            <p className="text-brand-400 text-xs font-medium">Dorados</p>
          </div>
        )}
        {/* Botón cerrar en mobile */}
        {!collapsed && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-white text-xs font-semibold truncate">{user.nombre}</p>
            <p className="text-gray-400 text-xs">{rolLabel[user.rol] ?? user.rol}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle — solo desktop */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white
                   rounded-full hidden lg:flex items-center justify-center shadow-md transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
