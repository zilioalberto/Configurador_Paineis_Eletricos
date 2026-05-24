/**
 * Tipos da gestão de utilizadores (admin): DTOs e payloads alinhados à API `/auth/users/`.
 */

/** Opção de tipo de utilizador (`GET /auth/user-tipo-choices/`). */
export type TipoUsuarioOption = {
  value: string
  label: string
}

/** Permissão disponível no catálogo (`GET /auth/user-permission-options/`). */
export type UserPermissionOption = {
  value: string
  label: string
}

/** Catálogo de permissões e defaults por tipo de utilizador. */
export type UserPermissionOptionsResponse = {
  permissions: UserPermissionOption[]
  defaults_by_tipo: Record<string, string[]>
}

/** Utilizador listado ou retornado após create/update na administração. */
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
  /** Registo de RH vinculado (somente leitura; vínculo principal no cadastro do colaborador). */
  colaborador_id: string | null
  colaborador_matricula: string | null
  colaborador_nome: string | null
}

/** Payload de criação; `permissoes` é o conjunto desejado (backend deriva extras/negadas). */
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

/** Payload de edição; senha em branco mantém a atual. */
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
