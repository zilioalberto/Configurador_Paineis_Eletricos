import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/AuthContext'
import { hasPermission } from '@/modules/auth/permissions'

type RequirePermissionProps = Readonly<{
  permission: string
  children: ReactNode
}>

export default function RequirePermission({ permission, children }: RequirePermissionProps) {
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

  if (!hasPermission(user, permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
