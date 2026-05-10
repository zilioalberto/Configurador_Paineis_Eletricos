import {
  dashboardMenuItems,
  dashboardRoutes,
} from './dashboard/dashboard.registry'
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
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'

export const configuradorPaineisRoutes: ModuleRouteConfig[] = [
  ...dashboardRoutes,
  ...projetosRoutes,
  ...cargasRoutes,
  ...dimensionamentoRoutes,
  ...composicaoRoutes,
]

export const configuradorPaineisMenuItems: AppMenuItem[] = [
  ...dashboardMenuItems,
  ...projetosMenuItems,
  ...cargasMenuItems,
  ...dimensionamentoMenuItems,
  ...composicaoMenuItems,
]
