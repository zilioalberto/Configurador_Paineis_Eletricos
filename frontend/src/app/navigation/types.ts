import type { ReactElement } from 'react'

export type AppMenuItem = {
  to: string
  label: string
  end?: boolean
  /** Menor aparece primeiro no menu lateral */
  order?: number
}

export type ModuleRouteConfig = {
  path: string
  element: ReactElement
}
