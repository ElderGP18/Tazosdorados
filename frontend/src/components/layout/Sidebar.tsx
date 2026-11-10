import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, Layers, BookOpen,
  Archive, TrendingUp, ShoppingBag, AlertTriangle, BarChart2,
  LogOut, ChevronLeft, ChevronRight, ArrowLeftRight, X,
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
      className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ease-out ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{
        background: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
        boxShadow: '4px 0 24px -4px rgba(0,0,0,0.3)',
      }}
    >
      {/* ── Logo header ──────────────────────────────────── */}
      <div className={`flex items-center h-20 px-4 border-b border-white/5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 rounded-full" />
          <img
            src="/logo.png"
            alt="Tazos Dorados"
            className={`relative rounded-full ring-2 ring-brand-400/60 shadow-lg object-cover ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`}
          />
        </div>
        {!collapsed && (
          <div className="flex-1 animate-fade-in">
            <p className="font-display font-black text-white text-lg leading-none tracking-wide">TAZOS</p>
            <p className="font-display font-bold text-brand-400 text-sm leading-tight tracking-widest">DORADOS</p>
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navegación ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 stagger">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link animate-slide-in ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0 relative z-10">{item.icon}</span>
            {!collapsed && <span className="relative z-10">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Usuario + Logout ─────────────────────────────── */}
      <div className="border-t border-white/5 p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {user.nombre?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.nombre}</p>
              <p className="text-brand-400/70 text-[10px] uppercase tracking-wide">{rolLabel[user.rol] ?? user.rol}</p>
            </div>
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
        className="absolute -right-3 top-24 w-6 h-6 bg-brand-500 hover:bg-brand-600 text-white
                   rounded-full hidden lg:flex items-center justify-center shadow-lg transition-all
                   hover:scale-110 ring-2 ring-stone-900"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
