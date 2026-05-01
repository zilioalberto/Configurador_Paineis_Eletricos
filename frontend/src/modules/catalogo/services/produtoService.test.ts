import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()
const putMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    put: (...a: unknown[]) => putMock(...a),
    delete: (...a: unknown[]) => deleteMock(...a),
  },
}))

import {
  atualizarProduto,
  buscarProdutosAutocomplete,
  criarProduto,
  excluirProduto,
  listarProdutos,
  obterProduto,
} from '@/modules/catalogo/services/produtoService'

describe('produtoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarProdutos normaliza página DRF (count, next, previous)', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        count: 99,
        next: 'http://x?page=2',
        previous: null,
        results: [{ id: 'p1', codigo: 'C1' }],
      },
    })
    const page = await listarProdutos('cat1', 1, 50)
    expect(page.items).toEqual([{ id: 'p1', codigo: 'C1' }])
    expect(page.total).toBe(99)
    expect(page.hasNext).toBe(true)
    expect(page.hasPrevious).toBe(false)
    expect(getMock).toHaveBeenCalledWith('/catalogo/produtos/', {
      params: { page: 1, page_size: 50, categoria: 'cat1' },
    })
  })

  it('listarProdutos sem categoriaId não envia categoria', async () => {
    getMock.mockResolvedValueOnce({ data: [] })
    await listarProdutos(null, 2, 10)
    expect(getMock).toHaveBeenCalledWith('/catalogo/produtos/', {
      params: { page: 2, page_size: 10 },
    })
  })

  it('listarProdutos com payload não paginado usa tamanho da lista', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'a' }, { id: 'b' }] })
    const page = await listarProdutos(undefined, 1, 50)
    expect(page.total).toBe(2)
    expect(page.hasNext).toBe(false)
  })

  it('buscarProdutosAutocomplete exige 2+ caracteres', async () => {
    expect(await buscarProdutosAutocomplete(' a ')).toEqual([])
    expect(getMock).not.toHaveBeenCalled()
  })

  it('buscarProdutosAutocomplete envia search e categoria opcional', async () => {
    getMock.mockResolvedValueOnce({ data: { results: [{ id: 'x' }] } })
    await buscarProdutosAutocomplete('ab', 'GATEWAY')
    expect(getMock).toHaveBeenCalledWith('/catalogo/produtos/', {
      params: { search: 'ab', categoria: 'GATEWAY' },
    })
  })

  it('obterProduto, criarProduto, atualizarProduto e excluirProduto delegam ao cliente', async () => {
    getMock.mockResolvedValueOnce({ data: { id: '1' } })
    await expect(obterProduto('1')).resolves.toEqual({ id: '1' })

    postMock.mockResolvedValueOnce({ data: { id: '2' } })
    await expect(criarProduto({ x: 1 })).resolves.toEqual({ id: '2' })

    putMock.mockResolvedValueOnce({ data: { id: '1' } })
    await expect(atualizarProduto('1', {})).resolves.toEqual({ id: '1' })

    deleteMock.mockResolvedValueOnce(undefined)
    await excluirProduto('1')
    expect(deleteMock).toHaveBeenCalledWith('/catalogo/produtos/1/')
  })
})
