import { describe, expect, it, vi, afterEach } from 'vitest'

import { getApiBaseUrl } from '@/services/apiBaseUrl'

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
})
