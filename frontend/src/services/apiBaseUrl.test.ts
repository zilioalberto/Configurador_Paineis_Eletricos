import { afterEach, describe, expect, it, vi } from 'vitest'

import { getApiBaseUrl, resolveApiBaseUrl } from '@/services/apiBaseUrl'

describe('getApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa VITE_API_BASE_URL quando definido', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.exemplo.com/api/v1')
    expect(getApiBaseUrl()).toBe('https://api.exemplo.com/api/v1')
  })

  it('usa fallback local quando env ausente', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(getApiBaseUrl()).toBe('http://localhost:8000/api/v1')
  })

  it('evita API localhost quando a pagina esta em dominio remoto', () => {
    expect(resolveApiBaseUrl('http://localhost:8000/api/v1', 'portal.zfw.com.br')).toBe(
      'https://api.zfw.com.br/api/v1'
    )
  })
})
