type AuthUser = {
  email: string
  first_name: string
  last_name: string
  tipo_usuario: string
  permissoes?: string[]
}

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
