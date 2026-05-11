import type { ReactElement } from 'react'

/** Item simples com destino de rota (entrada linear ou filho de grupo). */
export type AppMenuLinkItem = {
  to: string
  label: string
  end?: boolean
  /** Menor aparece primeiro no menu lateral */
  order?: number
  /** Só aparece para administradores da aplicação (tipo ADMIN ou superusuário). */
  requiresAppAdmin?: boolean
  /** Só aparece para utilizadores com esta permissão efetiva. */
  requiresPermission?: string
}

/** Agrupa várias rotas num submenu (painel ao lado), sem rota própria no primeiro nível. */
export type AppMenuGroupItem = {
  type: 'group'
  /** Identificador estável (ícone, eventos, aria). */
  id: string
  label: string
  order?: number
  requiresAppAdmin?: boolean
  requiresPermission?: string
  children: AppMenuLinkItem[]
}

export type AppMenuItem = AppMenuLinkItem | AppMenuGroupItem

export function isAppMenuGroup(item: AppMenuItem): item is AppMenuGroupItem {
  return 'type' in item && item.type === 'group'
}

export type ModuleRouteConfig = {
  path: string
  element: ReactElement
}
