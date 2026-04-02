import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const ComposicaoPage = lazy(() => import('./pages/ComposicaoPage'))

export const composicaoMenuItems: AppMenuItem[] = [
  { to: '/composicao', label: 'Composição', order: 50 },
]

export const composicaoRoutes: ModuleRouteConfig[] = [
  { path: '/composicao', element: <ComposicaoPage /> },
]
