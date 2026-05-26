import { lazy } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ComposicaoPage = lazy(() => import('./pages/ComposicaoPage'))

/** Registo de rotas e menu do módulo composição no app. */
/** Sem itens no menu lateral — acesso via fluxo do wizard. */
export const composicaoMenuItems: AppMenuLinkItem[] = []

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
