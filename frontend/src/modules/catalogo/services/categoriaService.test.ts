import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}))

import { listarCategoriasProduto } from './categoriaService'

describe('categoriaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista categorias vindas de array direto', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'c1' }] })

    await expect(listarCategoriasProduto()).resolves.toEqual([{ id: 'c1' }])
    expect(getMock).toHaveBeenCalledWith('/catalogo/categorias/')
  })

  it('normaliza paginação DRF e payload vazio', async () => {
    getMock.mockResolvedValueOnce({ data: { results: [{ id: 'c2' }] } })
    await expect(listarCategoriasProduto()).resolves.toEqual([{ id: 'c2' }])

    getMock.mockResolvedValueOnce({ data: {} })
    await expect(listarCategoriasProduto()).resolves.toEqual([])
  })
})
