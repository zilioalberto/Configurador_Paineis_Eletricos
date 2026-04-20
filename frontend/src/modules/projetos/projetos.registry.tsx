import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ProjetoListPage = lazy(() => import('./pages/ProjetoListPage'))
const ProjetoCreatePage = lazy(() => import('./pages/ProjetoCreatePage'))
const ProjetoEditPage = lazy(() => import('./pages/ProjetoEditPage'))
const ProjetoDetailPage = lazy(() => import('./pages/ProjetoDetailPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const projetosMenuItems: AppMenuItem[] = [
  {
    to: '/projetos',
    label: 'Projetos',
    order: 10,
    requiresPermission: PERMISSION_KEYS.PROJETO_VISUALIZAR,
  },
]

/** Rotas mais específicas antes de `/projetos/:id`. */
export const projetosRoutes: ModuleRouteConfig[] = [
  {
    path: '/projetos',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoListPage />),
  },
  {
    path: '/projetos/novo',
    element: withPermission(PERMISSION_KEYS.PROJETO_CRIAR, <ProjetoCreatePage />),
  },
  {
    path: '/projetos/:id/editar',
    element: withPermission(PERMISSION_KEYS.PROJETO_EDITAR, <ProjetoEditPage />),
  },
  {
    path: '/projetos/:id',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoDetailPage />),
  },
]
