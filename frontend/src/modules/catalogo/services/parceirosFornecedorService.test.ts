import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}))

import { listarFornecedoresAtivos } from './parceirosFornecedorService'

describe('parceirosFornecedorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza lista paginada de fornecedores ativos', async () => {
    getMock.mockResolvedValueOnce({ data: { results: [{ id: 'f1' }] } })

    await expect(listarFornecedoresAtivos()).resolves.toEqual([{ id: 'f1' }])

    expect(getMock).toHaveBeenCalledWith('/cadastros/parceiros/', {
      params: { tipo: 'fornecedor', ativo: '1', page_size: 500 },
    })
  })

  it('aceita lista direta e payload inesperado', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'f2' }] })
    await expect(listarFornecedoresAtivos()).resolves.toEqual([{ id: 'f2' }])

    getMock.mockResolvedValueOnce({ data: { results: null } })
    await expect(listarFornecedoresAtivos()).resolves.toEqual([])
  })
})
