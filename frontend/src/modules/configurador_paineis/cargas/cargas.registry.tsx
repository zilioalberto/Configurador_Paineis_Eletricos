/** Registro de rotas e itens de menu do módulo cargas. */

import { lazy, type ReactElement } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequireAnyPermission from '@/modules/auth/RequireAnyPermission'
import RequirePermission from '@/modules/auth/RequirePermission'

const CARGAS_VISUALIZAR_PERMS = [
  PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  PERMISSION_KEYS.PROJETO_VISUALIZAR,
] as const

function withViewCargasPermission(element: ReactElement): ReactElement {
  return (
    <RequireAnyPermission permissions={[...CARGAS_VISUALIZAR_PERMS]}>
      {element}
    </RequireAnyPermission>
  )
}

const CargaListPage = lazy(() => import('./pages/CargaListPage'))
const CargaCreatePage = lazy(() => import('./pages/CargaCreatePage'))
const CargaEditPage = lazy(() => import('./pages/CargaEditPage'))
const CargaDetailPage = lazy(() => import('./pages/CargaDetailPage'))
const CargaModelosPage = lazy(() => import('./pages/CargaModelosPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

/** Sem itens no menu lateral — acesso via fluxo do wizard a partir de `/configurador/configuracoes`. */
export const cargasMenuItems: AppMenuLinkItem[] = []

const canonicalCargaRoutes: ModuleRouteConfig[] = [
  {
    path: '/configurador/cargas',
    element: withViewCargasPermission(<CargaListPage />),
  },
  {
    path: '/configurador/cargas/novo',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaCreatePage />),
  },
  {
    path: '/configurador/cargas/modelos',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaModelosPage />),
  },
  {
    path: '/configurador/cargas/:id/editar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <CargaEditPage />),
  },
  {
    path: '/configurador/cargas/:id',
    element: withViewCargasPermission(<CargaDetailPage />),
  },
]

/** Rotas legadas `/cargas/*` mantidas por compatibilidade. */
const legacyCargaRoutes: ModuleRouteConfig[] = [
  {
    path: '/cargas',
    element: withViewCargasPermission(<CargaListPage />),
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
    element: withViewCargasPermission(<CargaDetailPage />),
  },
]

export const cargasRoutes: ModuleRouteConfig[] = [
  ...canonicalCargaRoutes,
  ...legacyCargaRoutes,
]
