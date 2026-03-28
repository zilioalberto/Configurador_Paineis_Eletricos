import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const CargaListPage = lazy(() => import('./pages/CargaListPage'))
const CargaCreatePage = lazy(() => import('./pages/CargaCreatePage'))
const CargaEditPage = lazy(() => import('./pages/CargaEditPage'))
const CargaDetailPage = lazy(() => import('./pages/CargaDetailPage'))

export const cargasMenuItems: AppMenuItem[] = [
  { to: '/cargas', label: 'Cargas', order: 20 },
]

/** Rotas específicas antes de `/cargas/:id`. */
export const cargasRoutes: ModuleRouteConfig[] = [
  { path: '/cargas', element: <CargaListPage /> },
  { path: '/cargas/novo', element: <CargaCreatePage /> },
  { path: '/cargas/:id/editar', element: <CargaEditPage /> },
  { path: '/cargas/:id', element: <CargaDetailPage /> },
]
