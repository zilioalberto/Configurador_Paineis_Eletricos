import { catalogoMenuItems, catalogoRoutes } from '@/modules/catalogo/catalogo.registry'
import {
  configuradorMenuItems,
  configuradorRoutes,
} from '@/modules/configurador/configurador.registry'
import { modulosMenuItems, modulosRoutes } from '@/modules/modulos/modulos.registry'
import {
  placeholdersMenuItems,
  placeholdersRoutes,
} from '@/modules/placeholders/placeholders.registry'
import {
  usuariosAdminMenuItems,
  usuariosAdminRoutes,
} from '@/modules/usuarios/usuarios.registry'
import type { AppMenuItem, ModuleRouteConfig } from './types'

const routeModules: ModuleRouteConfig[][] = [
  modulosRoutes,
  configuradorRoutes,
  catalogoRoutes,
  placeholdersRoutes,
  usuariosAdminRoutes,
]

const menuModules: AppMenuItem[][] = [
  modulosMenuItems,
  configuradorMenuItems,
  catalogoMenuItems,
  placeholdersMenuItems,
  usuariosAdminMenuItems,
]

export const appChildRoutes: ModuleRouteConfig[] = routeModules.flat()

export const appMenuItems: AppMenuItem[] = menuModules
  .flat()
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
