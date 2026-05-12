import type { AuthUser } from '@/modules/auth/types'

export function authUser(permissoes: string[] = [], overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    email: 'u@test.com',
    first_name: '',
    last_name: '',
    tipo_usuario: 'USUARIO',
    permissoes,
    ...overrides,
  }
}
