import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/AuthContext'
import { isAppAdmin } from '@/modules/auth/appAdmin'

type RequireAppAdminProps = Readonly<{ children: ReactNode }>

export default function RequireAppAdmin({ children }: RequireAppAdminProps) {
  const { user, status } = useAuth()

  if (status !== 'ready') {
    return (
      <div
        className="min-vh-50 d-flex align-items-center justify-content-center py-5"
        aria-busy="true"
        aria-live="polite"
      >
        <output className="spinner-border text-primary" aria-live="polite">
          <span className="visually-hidden">Carregando…</span>
        </output>
      </div>
    )
  }

  if (!isAppAdmin(user)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
