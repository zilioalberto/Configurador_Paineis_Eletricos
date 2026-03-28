import { catalogoMenuItems, catalogoRoutes } from '@/modules/catalogo/catalogo.registry'
import { dashboardMenuItems, dashboardRoutes } from '@/modules/dashboard/dashboard.registry'
import { cargasMenuItems, cargasRoutes } from '@/modules/cargas/cargas.registry'
import {
  placeholdersMenuItems,
  placeholdersRoutes,
} from '@/modules/placeholders/placeholders.registry'
import { projetosMenuItems, projetosRoutes } from '@/modules/projetos/projetos.registry'
import type { AppMenuItem, ModuleRouteConfig } from './types'

const routeModules: ModuleRouteConfig[][] = [
  dashboardRoutes,
  projetosRoutes,
  cargasRoutes,
  catalogoRoutes,
  placeholdersRoutes,
]

const menuModules: AppMenuItem[][] = [
  dashboardMenuItems,
  projetosMenuItems,
  cargasMenuItems,
  catalogoMenuItems,
  placeholdersMenuItems,
]

export const appChildRoutes: ModuleRouteConfig[] = routeModules.flat()

export const appMenuItems: AppMenuItem[] = menuModules
  .flat()
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
