/** Checagem de permissão efetiva no cliente (admin da app tem acesso total). */

import type { AuthUser } from '@/modules/auth/types'
import { isAppAdmin } from '@/modules/auth/appAdmin'

/** Verifica se o utilizador possui a permissão informada. */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (isAppAdmin(user)) return true
  return Boolean(user.permissoes?.includes(permission))
}

/** Verifica se o utilizador possui pelo menos uma das permissões listadas. */
export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}
