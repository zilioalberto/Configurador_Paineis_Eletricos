export type AuthUser = {
  email: string
  first_name: string
  last_name: string
  tipo_usuario: string
  permissoes?: string[]
  /** Vem de `auth/me/`; usado para permissões além do tipo de utilizador. */
  is_staff?: boolean
  is_superuser?: boolean
}

export type TokenPair = {
  access: string
  refresh: string
}

export function authDisplayName(user: AuthUser): string {
  const full = `${user.first_name} ${user.last_name}`.trim()
  if (full.length > 0) return full
  return user.email
}
