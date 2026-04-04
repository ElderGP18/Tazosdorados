import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { getErrorMessage } from '../api/client'
import { jwtDecode } from '../utils/jwt'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    try {
      const { data } = await login(email, password)
      const decoded = jwtDecode(data.access_token)
      setAuth(
        { id: decoded.sub, nombre: decoded.nombre ?? email.split('@')[0], email, rol: decoded.rol ?? 'cajero' },
        data.access_token
      )
      navigate('/dashboard')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl shadow-lg mb-4">
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Tazos Dorados</h1>
          <p className="text-gray-400 mt-1 text-sm">Sistema de gestión de restaurante</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tazos.com"
                className="form-input"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pr-10"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-2.5 mt-2"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Entrar'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6">
            Admin por defecto: <span className="font-mono text-gray-600">admin@tazos.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}
