import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const PlaceholderOutlet = lazy(() => import('./PlaceholderOutlet'))

export const placeholdersMenuItems: AppMenuItem[] = [
  { to: '/composicao', label: 'Composição', order: 50 },
]

export const placeholdersRoutes: ModuleRouteConfig[] = [
  {
    path: '/composicao',
    element: <PlaceholderOutlet />,
  },
]
