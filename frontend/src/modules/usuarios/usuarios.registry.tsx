import { lazy, Suspense } from 'react'

import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import RequireAppAdmin from '@/modules/auth/RequireAppAdmin'

const UsuariosAdminPage = lazy(() => import('./pages/UsuariosAdminPage'))

function GuardedUsuariosAdminPage() {
  return (
    <RequireAppAdmin>
      <Suspense fallback={<div className="p-4 text-muted">Carregando…</div>}>
        <UsuariosAdminPage />
      </Suspense>
    </RequireAppAdmin>
  )
}

export const usuariosAdminMenuItems: AppMenuItem[] = [
  {
    to: '/administracao/utilizadores',
    label: 'Utilizadores',
    order: 950,
    requiresAppAdmin: true,
  },
]

export const usuariosAdminRoutes: ModuleRouteConfig[] = [
  { path: '/administracao/utilizadores', element: <GuardedUsuariosAdminPage /> },
]
