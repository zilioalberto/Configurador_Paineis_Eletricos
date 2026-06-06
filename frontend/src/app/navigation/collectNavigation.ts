import { catalogoMenuItems, catalogoRoutes } from '@/modules/catalogo/catalogo.registry'
import { fiscalMenuItems, fiscalRoutes } from '@/modules/fiscal/fiscal.registry'
import {
  configuradorPaineisMenuItems,
  configuradorPaineisRoutes,
} from '@/modules/configurador_paineis/configurador_paineis.registry'
import {
  orcamentosMenuItems,
  orcamentosRoutes,
} from '@/modules/orcamentos/orcamentos.registry'
import { modulosMenuItems, modulosRoutes } from '@/modules/modulos/modulos.registry'
import {
  placeholdersMenuItems,
  placeholdersRoutes,
} from '@/modules/placeholders/placeholders.registry'
import { tarefasMenuItems, tarefasRoutes } from '@/modules/tarefas/tarefas.registry'
import {
  usuariosAdminMenuItems,
  usuariosAdminRoutes,
} from '@/modules/usuarios/usuarios.registry'
import type { AppMenuItem, ModuleRouteConfig } from './types'

const routeModules: ModuleRouteConfig[][] = [
  modulosRoutes,
  configuradorPaineisRoutes,
  catalogoRoutes,
  fiscalRoutes,
  tarefasRoutes,
  orcamentosRoutes,
  placeholdersRoutes,
  usuariosAdminRoutes,
]

const menuModules: AppMenuItem[][] = [
  modulosMenuItems,
  configuradorPaineisMenuItems,
  catalogoMenuItems,
  fiscalMenuItems,
  tarefasMenuItems,
  orcamentosMenuItems,
  placeholdersMenuItems,
  usuariosAdminMenuItems,
]

export const appChildRoutes: ModuleRouteConfig[] = routeModules.flat()

export const appMenuItems: AppMenuItem[] = menuModules
  .flat()
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
