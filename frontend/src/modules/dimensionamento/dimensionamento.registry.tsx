import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const DimensionamentoPage = lazy(() => import('./pages/DimensionamentoPage'))

export const dimensionamentoMenuItems: AppMenuItem[] = [
  {
    to: '/dimensionamento',
    label: 'Dimensionamento',
    order: 40,
    requiresPermission: PERMISSION_KEYS.PROJETO_VISUALIZAR,
  },
]

export const dimensionamentoRoutes: ModuleRouteConfig[] = [
  {
    path: '/dimensionamento',
    element: (
      <RequirePermission permission={PERMISSION_KEYS.PROJETO_VISUALIZAR}>
        <DimensionamentoPage />
      </RequirePermission>
    ),
  },
]
