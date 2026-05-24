/** Registro de rotas e item de menu do módulo dimensionamento. */

import { lazy } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const DimensionamentoPage = lazy(() => import('./pages/DimensionamentoPage'))

export const dimensionamentoMenuItems: AppMenuLinkItem[] = [
  {
    to: '/dimensionamento',
    label: 'Dimensionamento de condutores',
    order: 25,
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
