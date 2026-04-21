import type { AuthUser } from '@/modules/auth/types'

/** Administrador da aplicação: superusuário Django ou `tipo_usuario` ADMIN. */
export function isAppAdmin(user: AuthUser | null): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  return user.tipo_usuario === 'ADMIN'
}
