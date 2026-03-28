import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const PlaceholderOutlet = lazy(() => import('./PlaceholderOutlet'))

export const placeholdersMenuItems: AppMenuItem[] = [
  { to: '/dimensionamento', label: 'Dimensionamento', order: 40 },
  { to: '/composicao', label: 'Composição', order: 50 },
]

export const placeholdersRoutes: ModuleRouteConfig[] = [
  {
    path: '/dimensionamento',
    element: <PlaceholderOutlet />,
  },
  {
    path: '/composicao',
    element: <PlaceholderOutlet />,
  },
]
