import { catalogoMenuItems, catalogoRoutes } from '@/modules/catalogo/catalogo.registry'
import { dashboardMenuItems, dashboardRoutes } from '@/modules/dashboard/dashboard.registry'
import { cargasMenuItems, cargasRoutes } from '@/modules/cargas/cargas.registry'
import {
  composicaoMenuItems,
  composicaoRoutes,
} from '@/modules/composicao/composicao.registry'
import {
  dimensionamentoMenuItems,
  dimensionamentoRoutes,
} from '@/modules/dimensionamento/dimensionamento.registry'
import {
  placeholdersMenuItems,
  placeholdersRoutes,
} from '@/modules/placeholders/placeholders.registry'
import { projetosMenuItems, projetosRoutes } from '@/modules/projetos/projetos.registry'
import {
  usuariosAdminMenuItems,
  usuariosAdminRoutes,
} from '@/modules/usuarios/usuarios.registry'
import type { AppMenuItem, ModuleRouteConfig } from './types'

const routeModules: ModuleRouteConfig[][] = [
  dashboardRoutes,
  projetosRoutes,
  cargasRoutes,
  catalogoRoutes,
  dimensionamentoRoutes,
  composicaoRoutes,
  placeholdersRoutes,
  usuariosAdminRoutes,
]

const menuModules: AppMenuItem[][] = [
  dashboardMenuItems,
  projetosMenuItems,
  cargasMenuItems,
  catalogoMenuItems,
  dimensionamentoMenuItems,
  composicaoMenuItems,
  placeholdersMenuItems,
  usuariosAdminMenuItems,
]

export const appChildRoutes: ModuleRouteConfig[] = routeModules.flat()

export const appMenuItems: AppMenuItem[] = menuModules
  .flat()
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
