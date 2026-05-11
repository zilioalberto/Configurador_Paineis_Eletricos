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

export const configuradorPaineisRoutes: ModuleRouteConfig[] = [
  ...dashboardRoutes,
  ...projetosRoutes,
  ...cargasRoutes,
  ...dimensionamentoRoutes,
  ...composicaoRoutes,
]

function mergeChildren(...chunks: AppMenuLinkItem[][]): AppMenuLinkItem[] {
  return chunks
    .flat()
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
}

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

export const configuradorPaineisMenuItems: AppMenuItem[] = [configuradorPaineisGroup]
