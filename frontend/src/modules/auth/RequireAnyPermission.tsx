import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/modules/auth/AuthContext'
import { hasAnyPermission } from '@/modules/auth/permissions'

type RequireAnyPermissionProps = Readonly<{
  permissions: string[]
  children: ReactNode
}>

/** Guard de rota: exige pelo menos uma das permissões listadas. */
export default function RequireAnyPermission({
  permissions,
  children,
}: RequireAnyPermissionProps) {
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

  if (!hasAnyPermission(user, permissions)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
