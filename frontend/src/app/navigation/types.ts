import type { ReactElement } from 'react'

export type AppMenuItem = {
  to: string
  label: string
  end?: boolean
  /** Menor aparece primeiro no menu lateral */
  order?: number
  /** Só aparece para administradores da aplicação (tipo ADMIN ou superusuário). */
  requiresAppAdmin?: boolean
}

export type ModuleRouteConfig = {
  path: string
  element: ReactElement
}
