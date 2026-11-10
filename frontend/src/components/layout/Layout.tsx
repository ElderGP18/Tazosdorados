import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '../../store/authStore'

export function Layout() {
  const { token } = useAuthStore()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen flex" style={{
      background: `
        radial-gradient(1200px 600px at 10% -10%, rgba(245, 158, 11, 0.06), transparent 60%),
        radial-gradient(1000px 500px at 100% 100%, rgba(234, 88, 12, 0.05), transparent 60%),
        #fafaf9
      `,
    }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`lg:block ${mobileOpen ? 'block animate-slide-in' : 'hidden'}`}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${
          collapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* key = pathname → relanzamos la animación en cada navegación.
             Importante: solo opacity, nunca transform — un transform en el
             ancestor rompe position: fixed de los modales. */}
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
