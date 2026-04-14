import apiClient from '@/services/apiClient'
import type {
  AdminUserCreatePayload,
  AdminUserDto,
  AdminUserUpdatePayload,
  TipoUsuarioOption,
} from '@/modules/usuarios/types'

export async function fetchTipoUsuarioChoices(): Promise<TipoUsuarioOption[]> {
  const { data } = await apiClient.get<TipoUsuarioOption[]>('auth/user-tipo-choices/')
  return data
}

export async function fetchAdminUsers(): Promise<AdminUserDto[]> {
  const { data } = await apiClient.get<AdminUserDto[]>('auth/users/')
  return data
}

export async function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUserDto> {
  const { data } = await apiClient.post<AdminUserDto>('auth/users/', payload)
  return data
}

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
