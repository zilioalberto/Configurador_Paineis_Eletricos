import { lazy } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'
import { configuradorPaths } from '../configuradorPaths'

const ComposicaoPage = lazy(() => import('./pages/ComposicaoPage'))

export const composicaoMenuItems: AppMenuLinkItem[] = [
  {
    to: configuradorPaths.composicao(),
    label: 'Composição do Painel',
    order: 50,
    requiresPermission: PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS,
  },
]

export const composicaoRoutes: ModuleRouteConfig[] = [
  {
    path: '/configurador/composicao',
    element: (
      <RequirePermission permission={PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS}>
        <ComposicaoPage />
      </RequirePermission>
    ),
  },
  {
    path: '/composicao',
    element: (
      <RequirePermission permission={PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS}>
        <ComposicaoPage />
      </RequirePermission>
    ),
  },
]
