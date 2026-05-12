import type { AuthUser } from '@/modules/auth/types'
import { isAppAdmin } from '@/modules/auth/appAdmin'

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  if (isAppAdmin(user)) return true
  return Boolean(user.permissoes?.includes(permission))
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}
