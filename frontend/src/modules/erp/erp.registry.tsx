/**
 * Registo de rotas e menu do shell ERP (cadastros, RH, orçamentos, configurações).
 * Reutiliza páginas de outros módulos com guards de permissão.
 */
import { lazy, type ReactElement } from 'react'

import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ErpModuleShellPage = lazy(() => import('./pages/ErpModuleShellPage'))
const CadastrosPage = lazy(() => import('@/modules/cadastros/pages/CadastrosPage'))
const RhPage = lazy(() => import('@/modules/rh/pages/RhPage'))
const OrcamentoDetailPage = lazy(() => import('./pages/OrcamentoDetailPage'))
const OrcamentoListPage = lazy(() => import('./pages/OrcamentoListPage'))
const ConfiguracoesErpPage = lazy(() => import('./pages/ConfiguracoesErpPage'))
const MargensClientesPage = lazy(() => import('./pages/MargensClientesPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

/** Itens de menu lateral do ERP. */
export const erpMenuItems: AppMenuItem[] = [
  {
    to: '/erp/cadastros',
    label: 'Cadastros',
    order: 45,
    requiresPermission: PERMISSION_KEYS.CADASTRO_VISUALIZAR,
  },
  {
    to: '/erp/rh',
    label: 'RH',
    order: 45.5,
    requiresPermission: PERMISSION_KEYS.RH_VISUALIZAR,
  },
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

/** Rotas lazy-loaded sob `/erp/`. */
export const erpRoutes: ModuleRouteConfig[] = [
  {
    path: '/erp/m/:moduleId',
    element: <ErpModuleShellPage />,
  },
  {
    path: '/erp/cadastros',
    element: withPermission(PERMISSION_KEYS.CADASTRO_VISUALIZAR, <CadastrosPage />),
  },
  {
    path: '/erp/rh',
    element: withPermission(PERMISSION_KEYS.RH_VISUALIZAR, <RhPage />),
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
    path: '/erp/orcamentos/margens-clientes',
    element: withPermission(PERMISSION_KEYS.ORCAMENTO_VISUALIZAR, <MargensClientesPage />),
  },
  {
    path: '/erp/configuracoes',
    element: withPermission(
      PERMISSION_KEYS.CONFIGURACAO_ERP_VISUALIZAR,
      <ConfiguracoesErpPage />
    ),
  },
]
