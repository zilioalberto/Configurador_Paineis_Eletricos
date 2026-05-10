import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ComposicaoPage = lazy(() => import('./pages/ComposicaoPage'))

export const composicaoMenuItems: AppMenuItem[] = [
  {
    to: '/composicao',
    label: 'Composição do painel',
    order: 50,
    requiresPermission: PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS,
  },
]

export const composicaoRoutes: ModuleRouteConfig[] = [
  {
    path: '/composicao',
    element: (
      <RequirePermission permission={PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS}>
        <ComposicaoPage />
      </RequirePermission>
    ),
  },
]
