/**
 * Agregador do módulo Catálogo: menu lateral (produtos + serviços) e rotas.
 */

import type {
  AppMenuGroupItem,
  AppMenuItem,
  AppMenuLinkItem,
  ModuleRouteConfig,
} from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { produtosMenuItems, produtosRoutes } from './produtos.registry'
import { servicosMenuItems, servicosRoutes } from './servicos.registry'

function mergeChildren(...chunks: AppMenuLinkItem[][]): AppMenuLinkItem[] {
  return chunks.flat().sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
}

export const catalogoRoutes: ModuleRouteConfig[] = [...produtosRoutes, ...servicosRoutes]

const catalogoGroup: AppMenuGroupItem = {
  type: 'group',
  id: 'catalogo',
  label: 'Catálogo',
  order: 30,
  requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
  children: mergeChildren(produtosMenuItems, servicosMenuItems),
}

export const catalogoMenuItems: AppMenuItem[] = [catalogoGroup]
