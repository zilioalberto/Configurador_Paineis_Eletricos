import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/modules/auth/AuthContext'

export default function RequireAuth() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status !== 'ready') {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-3 bg-light"
        aria-busy="true"
        aria-live="polite"
      >
        <output className="spinner-border text-primary" aria-live="polite">
          <span className="visually-hidden">A verificar sessão…</span>
        </output>
        <p className="text-muted small mb-0">A verificar sessão…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
