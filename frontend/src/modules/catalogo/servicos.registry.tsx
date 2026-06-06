/**
 * Rotas e menu do submódulo serviços do catálogo.
 */

import { lazy, type ReactElement } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'
import { catalogoPaths } from './catalogoPaths'

const ServicoListPage = lazy(() => import('./pages/ServicoListPage'))
const ServicoCreatePage = lazy(() => import('./pages/ServicoCreatePage'))
const ServicoEditPage = lazy(() => import('./pages/ServicoEditPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const servicosRoutes: ModuleRouteConfig[] = [
  {
    path: catalogoPaths.servicos,
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ServicoListPage />),
  },
  {
    path: catalogoPaths.servicoNovo,
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ServicoCreatePage />),
  },
  {
    path: '/catalogo/servicos/:id/editar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ServicoEditPage />),
  },
]

export const servicosMenuItems: AppMenuLinkItem[] = [
  {
    to: catalogoPaths.servicos,
    label: 'Serviços',
    order: 20,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
]
