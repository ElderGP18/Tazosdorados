import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
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
        { id: Number(decoded.sub), nombre: decoded.nombre ?? email.split('@')[0], email, rol: decoded.rol ?? 'cajero' },
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{
           background: `
             radial-gradient(800px 400px at 20% 20%, rgba(245, 158, 11, 0.25), transparent 60%),
             radial-gradient(900px 500px at 80% 80%, rgba(234, 88, 12, 0.22), transparent 60%),
             linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)
           `,
         }}>
      {/* Partículas decorativas */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-500 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md relative animate-fade-in-up">
        {/* ── Logo + marca ───────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-5 animate-float">
            <div className="absolute inset-0 bg-brand-400 blur-2xl opacity-60 rounded-full" />
            <img
              src="/logo.jpg"
              alt="Tazos Dorados"
              className="relative w-28 h-28 rounded-full ring-4 ring-brand-400/80 shadow-2xl object-cover"
            />
          </div>
          <h1 className="font-display font-black text-5xl text-white tracking-tight">TAZOS</h1>
          <p className="font-display font-bold text-brand-400 text-xl tracking-[0.3em] -mt-1">DORADOS</p>
          <p className="text-gray-400 mt-3 text-sm uppercase tracking-widest">Dobladas · Tacos · Shukos</p>
        </div>

        {/* ── Card login ─────────────────────────────────── */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 ring-1 ring-black/5">
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-500 mb-6">Entrá al panel de gestión</p>

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-3 mt-2 group"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/40 mt-6 tracking-wide">
          © Tazos Dorados · Guatemala
        </p>
      </div>
    </div>
  )
}
