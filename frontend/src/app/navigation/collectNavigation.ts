import { dashboardMenuItems, dashboardRoutes } from '@/modules/dashboard/dashboard.registry'
import {
  placeholdersMenuItems,
  placeholdersRoutes,
} from '@/modules/placeholders/placeholders.registry'
import { projetosMenuItems, projetosRoutes } from '@/modules/projetos/projetos.registry'
import type { AppMenuItem, ModuleRouteConfig } from './types'

const routeModules: ModuleRouteConfig[][] = [
  dashboardRoutes,
  projetosRoutes,
  placeholdersRoutes,
]

const menuModules: AppMenuItem[][] = [
  dashboardMenuItems,
  projetosMenuItems,
  placeholdersMenuItems,
]

export const appChildRoutes: ModuleRouteConfig[] = routeModules.flat()

export const appMenuItems: AppMenuItem[] = menuModules
  .flat()
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
