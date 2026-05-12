import { useState, type SyntheticEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { APP_PRODUCT_FULL_NAME } from '@/constants/appBranding'
import { ZFW_LOGO_PNG_URL } from '@/constants/brandingAssets'
import { ZFW_SITE_URL } from '@/constants/zfwSite'
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
        <output className="spinner-border text-primary" aria-live="polite">
          <span className="visually-hidden">Carregando…</span>
        </output>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const message = ApiError.isApiError(err)
        ? err.message
        : 'Não foi possível entrar. Tente novamente.'
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
            <div className="text-center mb-4">
              <a
                href={ZFW_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="d-inline-block text-decoration-none"
                aria-label="ZFW Engenharia — site oficial (abre em nova aba)"
              >
                <img
                  src={ZFW_LOGO_PNG_URL}
                  alt="ZFW Engenharia"
                  width={220}
                  height={72}
                  decoding="async"
                  className="d-block mx-auto"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </a>
              <p className="text-muted small mb-0 mt-3">{APP_PRODUCT_FULL_NAME}</p>
            </div>

            <h1 className="h5 mb-1 text-center">Entrar</h1>
            <p className="text-muted small mb-4 text-center">
              Use o e-mail e a senha da sua conta para acessar o sistema.
            </p>

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
                  Senha
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
                  <span className="d-inline-flex align-items-center gap-2">
                    <output
                      className="spinner-border spinner-border-sm m-0"
                      aria-live="polite"
                      aria-label="Entrando"
                    />
                    <span>Entrando…</span>
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center small text-muted mt-3 mb-0">
          Em caso de dúvidas sobre acesso, fale com o administrador.
        </p>
      </div>
    </div>
  )
}
