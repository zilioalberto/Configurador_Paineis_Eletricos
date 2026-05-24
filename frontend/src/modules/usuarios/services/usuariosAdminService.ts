/**
 * Cliente HTTP da gestão de utilizadores (rotas `/auth/` no backend `accounts`).
 */
import apiClient from '@/services/apiClient'
import type {
  AdminUserCreatePayload,
  AdminUserDto,
  AdminUserUpdatePayload,
  TipoUsuarioOption,
  UserPermissionOptionsResponse,
} from '@/modules/usuarios/types'

/** Lista tipos de utilizador para selects do formulário. */
export async function fetchTipoUsuarioChoices(): Promise<TipoUsuarioOption[]> {
  const { data } = await apiClient.get<TipoUsuarioOption[]>('auth/user-tipo-choices/')
  return data
}

/** Lista todos os utilizadores (requer permissão `usuario.gerenciar` ou admin). */
export async function fetchAdminUsers(): Promise<AdminUserDto[]> {
  const { data } = await apiClient.get<AdminUserDto[]>('auth/users/')
  return data
}

/** Catálogo de permissões e mapa de defaults por tipo. */
export async function fetchUserPermissionOptions(): Promise<UserPermissionOptionsResponse> {
  const { data } = await apiClient.get<UserPermissionOptionsResponse>('auth/user-permission-options/')
  return data
}

/** Cria conta de utilizador com permissões personalizadas. */
export async function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUserDto> {
  const { data } = await apiClient.post<AdminUserDto>('auth/users/', payload)
  return data
}

/** Atualiza perfil, tipo, permissões e senha opcional. */
export async function updateAdminUser(
  id: number,
  payload: AdminUserUpdatePayload
): Promise<AdminUserDto> {
  const body: Record<string, unknown> = { ...payload }
  if (!payload.password || payload.password.trim() === '') {
    delete body.password
  }
  const { data } = await apiClient.patch<AdminUserDto>(`auth/users/${id}/`, body)
  return data
}
