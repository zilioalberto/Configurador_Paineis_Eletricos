/**
 * Rotas e menu do módulo fiscal (NF-e recebidas, itens fiscais, NSU).
 */
import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const FiscalHomePage = lazy(() => import('./pages/FiscalHomePage'))
const ItensFiscaisListPage = lazy(() => import('./pages/ItensFiscaisListPage'))
const NfesRecebidasListPage = lazy(() => import('./pages/NfesRecebidasListPage'))
const NfeRecebidaDetailPage = lazy(() => import('./pages/NfeRecebidaDetailPage'))
const NfeImportarManualPage = lazy(() => import('./pages/NfeImportarManualPage'))
const ControleNsuPage = lazy(() => import('./pages/ControleNsuPage'))

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
  {
    path: '/fiscal/nfes',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <NfesRecebidasListPage />),
  },
  {
    path: '/fiscal/nfes/importar',
    element: withPermission(PERMISSION_KEYS.MATERIAL_EDITAR_LISTA, <NfeImportarManualPage />),
  },
  {
    path: '/fiscal/nfes/:id',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <NfeRecebidaDetailPage />),
  },
  {
    path: '/fiscal/nsu',
    element: withPermission(PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA, <ControleNsuPage />),
  },
]
