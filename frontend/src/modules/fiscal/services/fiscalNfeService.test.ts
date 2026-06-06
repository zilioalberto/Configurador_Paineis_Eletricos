import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import { listarNfesRecebidas } from './fiscalNfeService'

describe('fiscalNfeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza página de listagem', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { count: 1, results: [{ id: 1, chave_acesso: 'x' }], next: null, previous: null },
    })
    const page = await listarNfesRecebidas({}, 1, 50)
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(1)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfes/', {
      params: { page: 1, page_size: 50 },
    })
  })
})
