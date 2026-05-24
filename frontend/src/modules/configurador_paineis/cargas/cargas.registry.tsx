/** Registro de rotas e itens de menu do módulo cargas. */

import { lazy, type ReactElement } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'
import { configuradorPaths } from '../configuradorPaths'

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
    to: configuradorPaths.cargas(),
    label: 'Cargas do Projeto',
    order: 20,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
  {
    to: configuradorPaths.modelosCargas,
    label: 'Modelos de Carga',
    order: 21,
    requiresPermission: PERMISSION_KEYS.MATERIAL_EDITAR_LISTA,
  },
]

const canonicalCargaRoutes: ModuleRouteConfig[] = [
  {
    path: '/configurador/cargas',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <CargaListPage />),
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
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <CargaDetailPage />),
  },
]

/** Rotas legadas `/cargas/*` mantidas por compatibilidade. */
const legacyCargaRoutes: ModuleRouteConfig[] = [
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

export const cargasRoutes: ModuleRouteConfig[] = [
  ...canonicalCargaRoutes,
  ...legacyCargaRoutes,
]
