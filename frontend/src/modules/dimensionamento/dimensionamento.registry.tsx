import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const DimensionamentoPage = lazy(() => import('./pages/DimensionamentoPage'))

export const dimensionamentoMenuItems: AppMenuItem[] = [
  { to: '/dimensionamento', label: 'Dimensionamento', order: 40 },
]

export const dimensionamentoRoutes: ModuleRouteConfig[] = [
  { path: '/dimensionamento', element: <DimensionamentoPage /> },
]
