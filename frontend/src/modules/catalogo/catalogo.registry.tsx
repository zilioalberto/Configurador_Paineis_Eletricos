import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ProdutoListPage = lazy(() => import('./pages/ProdutoListPage'))
const ProdutoCreatePage = lazy(() => import('./pages/ProdutoCreatePage'))
const ProdutoEditPage = lazy(() => import('./pages/ProdutoEditPage'))
const ProdutoDetailPage = lazy(() => import('./pages/ProdutoDetailPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const catalogoMenuItems: AppMenuItem[] = [
  {
    to: '/catalogo',
    label: 'Catálogo',
    order: 30,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
]

export const catalogoRoutes: ModuleRouteConfig[] = [
  {
    path: '/catalogo',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ProdutoListPage />),
  },
  {
    path: '/catalogo/novo',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ProdutoCreatePage />),
  },
  {
    path: '/catalogo/:id/editar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ProdutoEditPage />),
  },
  {
    path: '/catalogo/:id',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ProdutoDetailPage />),
  },
]
