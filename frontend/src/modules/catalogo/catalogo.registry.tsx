import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const ProdutoListPage = lazy(() => import('./pages/ProdutoListPage'))
const ProdutoCreatePage = lazy(() => import('./pages/ProdutoCreatePage'))
const ProdutoEditPage = lazy(() => import('./pages/ProdutoEditPage'))
const ProdutoDetailPage = lazy(() => import('./pages/ProdutoDetailPage'))

export const catalogoMenuItems: AppMenuItem[] = [
  { to: '/catalogo', label: 'Catálogo', order: 30 },
]

export const catalogoRoutes: ModuleRouteConfig[] = [
  { path: '/catalogo', element: <ProdutoListPage /> },
  { path: '/catalogo/novo', element: <ProdutoCreatePage /> },
  { path: '/catalogo/:id/editar', element: <ProdutoEditPage /> },
  { path: '/catalogo/:id', element: <ProdutoDetailPage /> },
]
