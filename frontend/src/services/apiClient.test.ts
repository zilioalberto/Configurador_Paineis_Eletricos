import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refreshAccessToken = vi.hoisted(() => vi.fn().mockResolvedValue('new-access'))

vi.mock('@/modules/auth/refreshAccessToken', () => ({
  refreshAccessToken,
}))

import apiClient from '@/services/apiClient'
import { tokenStorage } from '@/modules/auth/tokenStorage'

describe('apiClient interceptors', () => {
  let mock: MockAdapter

  beforeEach(() => {
    tokenStorage.clear()
    refreshAccessToken.mockClear()
    mock = new MockAdapter(apiClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('401 seguido de 200 dispara refresh e repete o pedido', async () => {
    tokenStorage.setTokens('old', 'ref')
    mock.onGet('/projetos/').replyOnce(401).onGet('/projetos/').reply(200, [{ id: '1' }])
    const res = await apiClient.get('/projetos/')
    expect(res.data).toEqual([{ id: '1' }])
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('403 em auth/me trata como sessão inválida e tenta refresh', async () => {
    tokenStorage.setTokens('old', 'ref')
    mock
      .onGet('/auth/me/')
      .replyOnce(403)
      .onGet('/auth/me/')
      .reply(200, { email: 'a@b.com', first_name: '', last_name: '', tipo_usuario: 'ADM' })
    const res = await apiClient.get('/auth/me/')
    expect(res.data.email).toBe('a@b.com')
    expect(refreshAccessToken).toHaveBeenCalled()
  })

  it('401 no fluxo de token limpa storage', async () => {
    tokenStorage.setTokens('a', 'r')
    mock.onGet('/auth/token/foo/').reply(401)
    await expect(apiClient.get('/auth/token/foo/')).rejects.toThrow()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })
})
