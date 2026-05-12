import { describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}))

import {
  createAdminUser,
  fetchAdminUsers,
  fetchTipoUsuarioChoices,
  fetchUserPermissionOptions,
  updateAdminUser,
} from '@/modules/usuarios/services/usuariosAdminService'

describe('usuariosAdminService', () => {
  it('busca choices e utilizadores', async () => {
    getMock
      .mockResolvedValueOnce({ data: [{ value: 'USUARIO', label: 'Colaborador' }] })
      .mockResolvedValueOnce({ data: [{ id: 1, email: 'u@test.com' }] })
      .mockResolvedValueOnce({ data: { permissions: [], defaults_by_tipo: {} } })

    await expect(fetchTipoUsuarioChoices()).resolves.toHaveLength(1)
    await expect(fetchAdminUsers()).resolves.toHaveLength(1)
    await expect(fetchUserPermissionOptions()).resolves.toEqual({
      permissions: [],
      defaults_by_tipo: {},
    })
  })

  it('remove password vazia no update', async () => {
    postMock.mockResolvedValue({ data: { id: 1 } })
    patchMock.mockResolvedValue({ data: { id: 1 } })

    await createAdminUser({
      email: 'novo@test.com',
      password: 'segredo123',
      first_name: 'N',
      last_name: 'U',
      telefone: '',
      tipo_usuario: 'USUARIO',
      is_active: true,
    })
    expect(postMock).toHaveBeenCalled()

    await updateAdminUser(1, {
      email: 'u@test.com',
      first_name: 'U',
      last_name: 'T',
      telefone: '',
      tipo_usuario: 'USUARIO',
      is_active: true,
      password: '   ',
    })
    expect(patchMock).toHaveBeenCalledWith('auth/users/1/', {
      email: 'u@test.com',
      first_name: 'U',
      last_name: 'T',
      telefone: '',
      tipo_usuario: 'USUARIO',
      is_active: true,
    })
  })
})
