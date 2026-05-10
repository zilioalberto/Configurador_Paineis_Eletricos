import { lazy, type ReactElement } from 'react'

import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ErpModuleShellPage = lazy(() => import('./pages/ErpModuleShellPage'))
const OrcamentoDetailPage = lazy(() => import('./pages/OrcamentoDetailPage'))
const OrcamentoListPage = lazy(() => import('./pages/OrcamentoListPage'))
const ConfiguracoesErpPage = lazy(() => import('./pages/ConfiguracoesErpPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const erpMenuItems: AppMenuItem[] = [
  {
    to: '/erp/orcamentos',
    label: 'Orçamentos',
    order: 46,
    requiresPermission: PERMISSION_KEYS.ORCAMENTO_VISUALIZAR,
  },
  {
    to: '/erp/configuracoes',
    label: 'Configurações do ERP',
    order: 47,
    requiresPermission: PERMISSION_KEYS.CONFIGURACAO_ERP_VISUALIZAR,
  },
]

export const erpRoutes: ModuleRouteConfig[] = [
  {
    path: '/erp/m/:moduleId',
    element: <ErpModuleShellPage />,
  },
  {
    path: '/erp/orcamentos/:id',
    element: withPermission(PERMISSION_KEYS.ORCAMENTO_VISUALIZAR, <OrcamentoDetailPage />),
  },
  {
    path: '/erp/orcamentos',
    element: withPermission(PERMISSION_KEYS.ORCAMENTO_VISUALIZAR, <OrcamentoListPage />),
  },
  {
    path: '/erp/configuracoes',
    element: withPermission(
      PERMISSION_KEYS.CONFIGURACAO_ERP_VISUALIZAR,
      <ConfiguracoesErpPage />
    ),
  },
]
