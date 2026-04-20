export type TipoUsuarioOption = {
  value: string
  label: string
}

export type UserPermissionOption = {
  value: string
  label: string
}

export type UserPermissionOptionsResponse = {
  permissions: UserPermissionOption[]
  defaults_by_tipo: Record<string, string[]>
}

export type AdminUserDto = {
  id: number
  email: string
  first_name: string
  last_name: string
  telefone: string
  tipo_usuario: string
  permissoes_extras: string[]
  permissoes_negadas: string[]
  permissoes_efetivas: string[]
  is_active: boolean
  date_created: string
}

export type AdminUserCreatePayload = {
  email: string
  password: string
  first_name: string
  last_name: string
  telefone: string
  tipo_usuario: string
  permissoes?: string[]
  is_active: boolean
}

export type AdminUserUpdatePayload = {
  email: string
  first_name: string
  last_name: string
  telefone: string
  tipo_usuario: string
  permissoes?: string[]
  is_active: boolean
  password?: string
}
