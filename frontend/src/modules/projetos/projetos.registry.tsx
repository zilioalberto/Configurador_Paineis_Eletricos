import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const ProjetoListPage = lazy(() => import('./pages/ProjetoListPage'))
const ProjetoCreatePage = lazy(() => import('./pages/ProjetoCreatePage'))
const ProjetoEditPage = lazy(() => import('./pages/ProjetoEditPage'))
const ProjetoDetailPage = lazy(() => import('./pages/ProjetoDetailPage'))

export const projetosMenuItems: AppMenuItem[] = [
  { to: '/projetos', label: 'Projetos', order: 10 },
]

/** Rotas mais específicas antes de `/projetos/:id`. */
export const projetosRoutes: ModuleRouteConfig[] = [
  { path: '/projetos', element: <ProjetoListPage /> },
  { path: '/projetos/novo', element: <ProjetoCreatePage /> },
  { path: '/projetos/:id/editar', element: <ProjetoEditPage /> },
  { path: '/projetos/:id', element: <ProjetoDetailPage /> },
]
