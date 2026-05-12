import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
  },
}))

import type { ItemFiscalProdutoListRow } from '../types/itemFiscalProduto'
import { listarItensFiscais } from './fiscalService'

function rowStub(id: string): ItemFiscalProdutoListRow {
  return { id } as ItemFiscalProdutoListRow
}

describe('fiscalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista vazia quando a API nao devolve results', async () => {
    getMock.mockResolvedValueOnce({ data: {} })

    await expect(listarItensFiscais()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
    })

    expect(getMock).toHaveBeenCalledWith('/fiscal/itens-fiscais/', {
      params: { page: 1, page_size: 50 },
    })
  })

  it('normaliza pagina com results, next, previous e count numerico', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        count: 42,
        next: 'https://api/?page=2',
        previous: null,
        results: [rowStub('1')],
      },
    })

    await expect(listarItensFiscais('motor', 2, 10)).resolves.toEqual({
      items: [rowStub('1')],
      total: 42,
      page: 2,
      pageSize: 10,
      hasNext: true,
      hasPrevious: false,
    })

    expect(getMock).toHaveBeenCalledWith('/fiscal/itens-fiscais/', {
      params: { page: 2, page_size: 10, search: 'motor' },
    })
  })

  it('interpreta count string e ignora busca so com espacos', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        count: '99',
        next: null,
        previous: 'https://api/?page=1',
        results: [rowStub('2')],
      },
    })

    await expect(listarItensFiscais('   ', 1, 50)).resolves.toMatchObject({ total: 99 })

    expect(getMock).toHaveBeenCalledWith('/fiscal/itens-fiscais/', {
      params: { page: 1, page_size: 50 },
    })
  })

  it('usa tamanho da lista quando count nao e numerico', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        count: 'x',
        results: [rowStub('a'), rowStub('b')],
      },
    })

    await expect(listarItensFiscais()).resolves.toMatchObject({ total: 2 })
  })

  it('usa tamanho da lista quando count e string vazia', async () => {
    getMock.mockResolvedValueOnce({
      data: { count: '', results: [rowStub('only')] },
    })

    await expect(listarItensFiscais()).resolves.toMatchObject({ total: 1 })
  })
})
