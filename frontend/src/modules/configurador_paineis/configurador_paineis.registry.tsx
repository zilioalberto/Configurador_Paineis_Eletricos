/**
 * Agregador do módulo Configurador de Painéis: rotas e menu lateral.
 * Menu único → hub de configurações; cargas/dimensionamento/composição só pelo fluxo (wizard).
 */

import { Navigate } from 'react-router-dom'

import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { cargasRoutes } from './cargas/cargas.registry'
import { composicaoRoutes } from './composicao/composicao.registry'
import { configuradorPaths } from './configuradorPaths'
import { dashboardRoutes } from './dashboard/dashboard.registry'
import {
  dimensionamentoRoutes,
} from './dimensionamento/dimensionamento.registry'
import { projetosRoutes } from './projetos/projetos.registry'

/** Rotas React Router de todos os submódulos do configurador. */
export const configuradorPaineisRoutes: ModuleRouteConfig[] = [
  { path: '/configurador', element: <Navigate to={configuradorPaths.configuracoes} replace /> },
  ...dashboardRoutes,
  ...projetosRoutes,
  ...cargasRoutes,
  ...dimensionamentoRoutes,
  ...composicaoRoutes,
]

/** Entrada única no menu: abre a lista / hub de configurações de painel. */
export const configuradorPaineisMenuItems: AppMenuItem[] = [
  {
    to: configuradorPaths.configuracoes,
    label: 'Configurador de Painéis',
    order: 5,
    requiresPermission: PERMISSION_KEYS.PROJETO_VISUALIZAR,
  },
]
