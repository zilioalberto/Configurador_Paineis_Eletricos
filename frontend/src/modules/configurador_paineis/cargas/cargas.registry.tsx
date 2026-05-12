import { lazy, type ReactElement } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const CargaListPage = lazy(() => import('./pages/CargaListPage'))
const CargaCreatePage = lazy(() => import('./pages/CargaCreatePage'))
const CargaEditPage = lazy(() => import('./pages/CargaEditPage'))
const CargaDetailPage = lazy(() => import('./pages/CargaDetailPage'))
const CargaModelosPage = lazy(() => import('./pages/CargaModelosPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const cargasMenuItems: AppMenuLinkItem[] = [
  {
    to: '/cargas',
<<<<<<< HEAD:frontend/src/modules/configurador_paineis/cargas/cargas.registry.tsx
    label: 'Cargas do Projeto',
=======
    label: 'Cargas do projeto',
>>>>>>> origin/main:frontend/src/modules/cargas/cargas.registry.tsx
    order: 20,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
  {
    to: '/cargas/modelos',
    label: 'Modelos de Carga',
    order: 21,
    requiresPermission: PERMISSION_KEYS.MATERIAL_EDITAR_LISTA,
  },
]

/** Rotas específicas antes de `/cargas/:id`. */
export const cargasRoutes: ModuleRouteConfig[] = [
  {
    path: '/cargas',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <CargaListPage />),
  },
  {
    path: '/cargas/novo',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaCreatePage />),
  },
  {
    path: '/cargas/modelos',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaModelosPage />),
  },
  {
    path: '/cargas/:id/editar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaEditPage />),
  },
  {
    path: '/cargas/:id',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <CargaDetailPage />),
  },
]
