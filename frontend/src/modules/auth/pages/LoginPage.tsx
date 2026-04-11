import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/AuthContext'
import { ApiError } from '@/services/http/ApiError'

type LocationState = { from?: { pathname: string } }

export default function LoginPage() {
  const { user, status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const from = state?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status !== 'ready') {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center bg-light"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">A carregar…</span>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const message = ApiError.isApiError(err) ? err.message : 'Não foi possível iniciar sessão.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light px-3">
      <div className="w-100" style={{ maxWidth: '420px' }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h1 className="h4 mb-1">Iniciar sessão</h1>
            <p className="text-muted small mb-4">Utilize o e-mail e a palavra-passe da sua conta.</p>

            <form onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="mb-3">
                <label htmlFor="login-email" className="form-label">
                  E-mail
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-control"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="login-password" className="form-label">
                  Palavra-passe
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-control"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden
                    />
                    A entrar…
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center small text-muted mt-3 mb-0">
          Em caso de dúvidas sobre acesso, contacte o administrador.
        </p>
      </div>
    </div>
  )
}
