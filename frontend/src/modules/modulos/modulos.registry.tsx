import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const ModuleLauncherPage = lazy(() => import('./pages/ModuleLauncherPage'))

export const modulosMenuItems: AppMenuItem[] = [
  { to: '/', label: 'Módulos', end: true, order: 0 },
]

export const modulosRoutes: ModuleRouteConfig[] = [
  { path: '/', element: <ModuleLauncherPage /> },
]
