import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('refreshAccessToken', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'novo-access' } })
    const { tokenStorage } = await import('@/modules/auth/tokenStorage')
    tokenStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejeita quando não há refresh token', async () => {
    const { refreshAccessToken } = await import('@/modules/auth/refreshAccessToken')
    await expect(refreshAccessToken()).rejects.toThrow(/Sem refresh token/)
  })

  it('grava novo access e partilha pedidos concorrentes', async () => {
    const { tokenStorage } = await import('@/modules/auth/tokenStorage')
    const { refreshAccessToken } = await import('@/modules/auth/refreshAccessToken')
    tokenStorage.setTokens('velho', 'meu-refresh')
    const [a, b] = await Promise.all([refreshAccessToken(), refreshAccessToken()])
    expect(a).toBe('novo-access')
    expect(b).toBe('novo-access')
    expect(tokenStorage.getAccess()).toBe('novo-access')
    expect(axios.post).toHaveBeenCalledTimes(1)
  })
})
