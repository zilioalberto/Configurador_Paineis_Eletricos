/**
 * Registo de rotas do dashboard (`/dashboard`).
 * A rota permanece ativa; não entra no menu linear do wizard.
 */

import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))

/** O painel `/dashboard` mantém-se como rota; deixou de constar no menu linear lateral. */
export const dashboardMenuItems: AppMenuItem[] = []

/** Rotas lazy-loaded do painel inicial. */
export const dashboardRoutes: ModuleRouteConfig[] = [
  { path: '/dashboard', element: <DashboardPage /> },
]
