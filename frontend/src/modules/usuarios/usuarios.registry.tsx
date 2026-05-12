import { lazy, Suspense } from 'react'

import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const UsuariosAdminPage = lazy(() => import('./pages/UsuariosAdminPage'))

function GuardedUsuariosAdminPage() {
  return (
    <RequirePermission permission={PERMISSION_KEYS.USUARIO_GERENCIAR}>
      <Suspense fallback={<div className="p-4 text-muted">Carregando…</div>}>
        <UsuariosAdminPage />
      </Suspense>
    </RequirePermission>
  )
}

export const usuariosAdminMenuItems: AppMenuItem[] = [
  {
    to: '/administracao/utilizadores',
    label: 'Utilizadores',
    order: 950,
    requiresPermission: PERMISSION_KEYS.USUARIO_GERENCIAR,
  },
]

export const usuariosAdminRoutes: ModuleRouteConfig[] = [
  { path: '/administracao/utilizadores', element: <GuardedUsuariosAdminPage /> },
]
