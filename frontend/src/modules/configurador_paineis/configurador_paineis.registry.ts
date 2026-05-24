/**
 * Agregador do módulo Configurador de Painéis: rotas e menu lateral
 * (dashboard + wizard projetos → cargas → dimensionamento → composição).
 */

import { dashboardRoutes } from './dashboard/dashboard.registry'
import { projetosMenuItems, projetosRoutes } from './projetos/projetos.registry'
import { cargasMenuItems, cargasRoutes } from './cargas/cargas.registry'
import {
  dimensionamentoMenuItems,
  dimensionamentoRoutes,
} from './dimensionamento/dimensionamento.registry'
import {
  composicaoMenuItems,
  composicaoRoutes,
} from './composicao/composicao.registry'
import type {
  AppMenuGroupItem,
  AppMenuItem,
  AppMenuLinkItem,
  ModuleRouteConfig,
} from '@/app/navigation/types'

/** Rotas React Router de todos os submódulos do configurador. */
export const configuradorPaineisRoutes: ModuleRouteConfig[] = [
  ...dashboardRoutes,
  ...projetosRoutes,
  ...cargasRoutes,
  ...dimensionamentoRoutes,
  ...composicaoRoutes,
]

/** Une entradas de menu dos submódulos e ordena por `order`. */
function mergeChildren(...chunks: AppMenuLinkItem[][]): AppMenuLinkItem[] {
  return chunks
    .flat()
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
}

/** Grupo colapsável no menu lateral (sem dashboard — rota `/dashboard` fica fora do grupo). */
const configuradorPaineisGroup: AppMenuGroupItem = {
  type: 'group',
  id: 'configurador-paineis',
  label: 'Configurador de Painéis',
  order: 5,
  children: mergeChildren(
    projetosMenuItems,
    cargasMenuItems,
    dimensionamentoMenuItems,
    composicaoMenuItems
  ),
}

/** Itens de navegação exportados para `collectNavigation`. */
export const configuradorPaineisMenuItems: AppMenuItem[] = [configuradorPaineisGroup]
