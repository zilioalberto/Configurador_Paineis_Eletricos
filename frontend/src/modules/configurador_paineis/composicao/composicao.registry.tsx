import { lazy } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ComposicaoPage = lazy(() => import('./pages/ComposicaoPage'))

export const composicaoMenuItems: AppMenuLinkItem[] = [
  {
    to: '/composicao',
<<<<<<< HEAD:frontend/src/modules/configurador_paineis/composicao/composicao.registry.tsx
    label: 'Composição do Painel',
=======
    label: 'Composição do painel',
>>>>>>> origin/main:frontend/src/modules/composicao/composicao.registry.tsx
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
