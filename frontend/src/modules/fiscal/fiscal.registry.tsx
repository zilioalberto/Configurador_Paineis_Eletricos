/**
 * Rotas e menu do módulo fiscal (home com busca e lista de itens).
 */
import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const FiscalHomePage = lazy(() => import('./pages/FiscalHomePage'))
const ItensFiscaisListPage = lazy(() => import('./pages/ItensFiscaisListPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const fiscalMenuItems: AppMenuItem[] = [
  {
    to: '/fiscal',
    label: 'Fiscal',
    order: 31,
    requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  },
]

export const fiscalRoutes: ModuleRouteConfig[] = [
  {
    path: '/fiscal',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <FiscalHomePage />),
  },
  {
    path: '/fiscal/itens-fiscais',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ItensFiscaisListPage />),
  },
]
