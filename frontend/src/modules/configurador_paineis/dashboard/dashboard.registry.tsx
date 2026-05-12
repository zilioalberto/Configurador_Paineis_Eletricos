import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

/** O painel `/dashboard` mantém-se como rota; deixou de constar no menu linear lateral. */
export const dashboardMenuItems: AppMenuItem[] = []

export const dashboardRoutes: ModuleRouteConfig[] = [
  { path: '/dashboard', element: <DashboardPage /> },
]
