/**
 * Tipos do módulo de autenticação (perfil vindo de `auth/me/` e par JWT).
 */

/** Utilizador autenticado exposto ao React após login ou bootstrap da sessão. */
export type AuthUser = {
  /** Presente quando o perfil vem de `auth/me/`. */
  id?: number
  email: string
  first_name: string
  last_name: string
  tipo_usuario: string
  permissoes?: string[]
  /** Vem de `auth/me/`; usado para permissões além do tipo de utilizador. */
  is_staff?: boolean
  is_superuser?: boolean
}

/** Par access/refresh retornado por `POST /auth/token/`. */
export type TokenPair = {
  access: string
  refresh: string
}

/** Nome para exibição na UI: nome completo ou e-mail como fallback. */
export function authDisplayName(user: AuthUser): string {
  const full = `${user.first_name} ${user.last_name}`.trim()
  if (full.length > 0) return full
  return user.email
}
