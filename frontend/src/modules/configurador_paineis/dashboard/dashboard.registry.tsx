import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

export const dashboardMenuItems: AppMenuItem[] = [
  { to: '/dashboard', label: 'Painel do configurador de painéis', end: true, order: 5 },
]

export const dashboardRoutes: ModuleRouteConfig[] = [
  { path: '/dashboard', element: <DashboardPage /> },
]
