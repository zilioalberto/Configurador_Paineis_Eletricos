/**
 * Rotas e menu do submódulo produtos do catálogo.
 */

import { lazy, type ReactElement } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'
import { catalogoPaths } from './catalogoPaths'

const ProdutoListPage = lazy(() => import('./pages/ProdutoListPage'))
const ProdutoCreatePage = lazy(() => import('./pages/ProdutoCreatePage'))
const ProdutoEditPage = lazy(() => import('./pages/ProdutoEditPage'))
const ProdutoDetailPage = lazy(() => import('./pages/ProdutoDetailPage'))
const NfeImportPage = lazy(() => import('./pages/NfeImportPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

function LegacyProdutoDetalheRedirect() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to={catalogoPaths.produtos} replace />
  return <Navigate to={catalogoPaths.produtoDetalhe(id)} replace />
}

function LegacyProdutoEditarRedirect() {
  const { id } = useParams<{ id: string }>()
  if (!id) return <Navigate to={catalogoPaths.produtos} replace />
  return <Navigate to={catalogoPaths.produtoEditar(id)} replace />
}

const produtosCanonicalRoutes: ModuleRouteConfig[] = [
  {
    path: catalogoPaths.produtos,
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ProdutoListPage />),
  },
  {
    path: catalogoPaths.produtoNovo,
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ProdutoCreatePage />),
  },
  {
    path: catalogoPaths.produtoImportarNfe,
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <NfeImportPage />),
  },
  {
    path: '/catalogo/produtos/:id/editar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <ProdutoEditPage />),
  },
  {
    path: '/catalogo/produtos/:id',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ProdutoDetailPage />),
  },
]

const produtosLegacyRoutes: ModuleRouteConfig[] = [
  { path: catalogoPaths.raiz, element: <Navigate to={catalogoPaths.produtos} replace /> },
  { path: '/catalogo/novo', element: <Navigate to={catalogoPaths.produtoNovo} replace /> },
  {
    path: '/catalogo/importar-nfe',
    element: <Navigate to={catalogoPaths.produtoImportarNfe} replace />,
  },
  { path: '/catalogo/:id/editar', element: <LegacyProdutoEditarRedirect /> },
  { path: '/catalogo/:id', element: <LegacyProdutoDetalheRedirect /> },
]

export const produtosRoutes: ModuleRouteConfig[] = [
  ...produtosCanonicalRoutes,
  ...produtosLegacyRoutes,
]

export const produtosMenuItems: AppMenuLinkItem[] = [
  {
    to: catalogoPaths.produtos,
    label: 'Produtos',
    order: 10,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
  {
    to: catalogoPaths.produtoImportarNfe,
    label: 'Importar NF-e',
    order: 11,
    requiresPermission: PERMISSION_KEYS.MATERIAL_EDITAR_LISTA,
  },
]
