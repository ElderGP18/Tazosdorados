import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ventas from './pages/ventas/Ventas'
import Productos from './pages/productos/Productos'
import Ingredientes from './pages/ingredientes/Ingredientes'
import Recetas from './pages/recetas/Recetas'
import Stock from './pages/stock/Stock'
import MovimientosStock from './pages/stock/MovimientosStock'
import Predicciones from './pages/predicciones/Predicciones'
import Recomendaciones from './pages/recomendaciones/Recomendaciones'
import Merma from './pages/merma/Merma'
import Reportes from './pages/reportes/Reportes'
import { useAuthStore } from './store/authStore'

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuthStore()
  return isAdmin() ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '14px', maxWidth: '380px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"       element={<Dashboard />} />
          <Route path="/ventas"          element={<Ventas />} />
          <Route path="/stock"           element={<Stock />} />
          <Route path="/movimientos"     element={<MovimientosStock />} />
          <Route path="/merma"           element={<Merma />} />
          {/* Solo admin */}
          <Route path="/productos"       element={<AdminOnly><Productos /></AdminOnly>} />
          <Route path="/ingredientes"    element={<AdminOnly><Ingredientes /></AdminOnly>} />
          <Route path="/recetas"         element={<AdminOnly><Recetas /></AdminOnly>} />
          <Route path="/predicciones"    element={<AdminOnly><Predicciones /></AdminOnly>} />
          <Route path="/recomendaciones" element={<AdminOnly><Recomendaciones /></AdminOnly>} />
          <Route path="/reportes"        element={<AdminOnly><Reportes /></AdminOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
