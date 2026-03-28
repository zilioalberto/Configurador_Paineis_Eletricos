import { lazy } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

const PlaceholderOutlet = lazy(() => import('./PlaceholderOutlet'))

export const placeholdersMenuItems: AppMenuItem[] = [
  { to: '/cargas', label: 'Cargas', order: 20 },
  { to: '/catalogo', label: 'Catálogo', order: 30 },
  { to: '/dimensionamento', label: 'Dimensionamento', order: 40 },
  { to: '/composicao', label: 'Composição', order: 50 },
]

export const placeholdersRoutes: ModuleRouteConfig[] = [
  { path: '/cargas', element: <PlaceholderOutlet /> },
  { path: '/catalogo', element: <PlaceholderOutlet /> },
  {
    path: '/dimensionamento',
    element: <PlaceholderOutlet />,
  },
  {
    path: '/composicao',
    element: <PlaceholderOutlet />,
  },
]
