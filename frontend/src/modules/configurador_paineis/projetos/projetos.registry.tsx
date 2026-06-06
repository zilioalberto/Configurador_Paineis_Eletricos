/** Registro de rotas e item de menu do módulo projetos. */

import { lazy, type ReactElement } from 'react'
import type { AppMenuLinkItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const ProjetoListPage = lazy(() => import('./pages/ProjetoListPage'))
const ProjetoCreatePage = lazy(() => import('./pages/ProjetoCreatePage'))
const ProjetoEditPage = lazy(() => import('./pages/ProjetoEditPage'))
const ProjetoConfiguracaoRedirectPage = lazy(
  () => import('./pages/ProjetoConfiguracaoRedirectPage')
)
const ProjetoWizardPage = lazy(() => import('./pages/ProjetoWizardPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

const configuradorConfiguracoesRoutes: ModuleRouteConfig[] = [
  {
    path: '/configurador/configuracoes',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoListPage />),
  },
  {
    path: '/configurador/configuracoes/novo',
    element: withPermission(PERMISSION_KEYS.PROJETO_CRIAR, <ProjetoCreatePage />),
  },
  {
    path: '/configurador/configuracoes/:id/editar',
    element: withPermission(PERMISSION_KEYS.PROJETO_EDITAR, <ProjetoEditPage />),
  },
  {
    path: '/configurador/configuracoes/:id/fluxo/:etapa',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoWizardPage />),
  },
  {
    path: '/configurador/configuracoes/:id',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoConfiguracaoRedirectPage />),
  },
]

/** Rotas legadas `/projetos/*` (compatibilidade) e canónicas `/configurador/configuracoes/*`. */
export const projetosRoutes: ModuleRouteConfig[] = [
  ...configuradorConfiguracoesRoutes,
  {
    path: '/projetos',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoListPage />),
  },
  {
    path: '/projetos/novo',
    element: withPermission(PERMISSION_KEYS.PROJETO_CRIAR, <ProjetoCreatePage />),
  },
  {
    path: '/projetos/:id/editar',
    element: withPermission(PERMISSION_KEYS.PROJETO_EDITAR, <ProjetoEditPage />),
  },
  {
    path: '/projetos/:id/fluxo/:etapa',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoWizardPage />),
  },
  {
    path: '/projetos/:id',
    element: withPermission(PERMISSION_KEYS.PROJETO_VISUALIZAR, <ProjetoConfiguracaoRedirectPage />),
  },
]

/** Itens de menu ficam no agregador `configurador_paineis.registry.tsx`. */
export const projetosMenuItems: AppMenuLinkItem[] = []
