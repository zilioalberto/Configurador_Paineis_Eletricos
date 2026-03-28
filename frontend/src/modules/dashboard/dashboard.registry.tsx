import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

export const dashboardMenuItems: AppMenuItem[] = [
  { to: '/', label: 'Dashboard', end: true, order: 0 },
]

export const dashboardRoutes: ModuleRouteConfig[] = [
  { path: '/', element: <DashboardPage /> },
]
