import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}))

import {
  aplicarImportacaoNfe,
  buscarProdutoResumoImportacaoNfe,
  listarFornecedoresNfe,
  previewNfeXml,
} from './nfeImportService'

describe('nfeImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia arquivo XML em FormData para preview', async () => {
    const arquivo = new File(['<xml />'], 'nota.xml', { type: 'text/xml' })
    postMock.mockResolvedValueOnce({ data: { produtos: [] } })

    await expect(previewNfeXml(arquivo)).resolves.toEqual({ produtos: [] })

    const [url, body] = postMock.mock.calls[0]
    expect(url).toBe('/catalogo/importacoes/nfe/preview/')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('arquivo')).toBe(arquivo)
  })

  it('aplica importação delegando payload', async () => {
    const payload = { itens: [{ codigo: 'P1' }] }
    postMock.mockResolvedValueOnce({ data: { criados: 1 } })

    await expect(aplicarImportacaoNfe(payload as never)).resolves.toEqual({ criados: 1 })

    expect(postMock).toHaveBeenCalledWith(
      '/catalogo/importacoes/nfe/aplicar/',
      payload
    )
  })

  it('lista fornecedores com search normalizado ou sem params', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'f1' }] })
    await expect(listarFornecedoresNfe('  acme  ')).resolves.toEqual([{ id: 'f1' }])
    expect(getMock).toHaveBeenCalledWith('/catalogo/importacoes/nfe/fornecedores/', {
      params: { search: 'acme' },
    })

    getMock.mockResolvedValueOnce({ data: [] })
    await listarFornecedoresNfe('   ')
    expect(getMock).toHaveBeenLastCalledWith(
      '/catalogo/importacoes/nfe/fornecedores/',
      { params: undefined }
    )
  })

  it('busca resumo de produto somente com código preenchido', async () => {
    await expect(buscarProdutoResumoImportacaoNfe('  ')).resolves.toBeNull()
    expect(getMock).not.toHaveBeenCalled()

    getMock.mockResolvedValueOnce({ data: { produto: { id: 'p1' } } })
    await expect(buscarProdutoResumoImportacaoNfe(' P1 ')).resolves.toEqual({
      id: 'p1',
    })
    expect(getMock).toHaveBeenCalledWith(
      '/catalogo/importacoes/nfe/produto-resumo/',
      { params: { codigo: 'P1' } }
    )

    getMock.mockResolvedValueOnce({ data: { produto: null } })
    await expect(buscarProdutoResumoImportacaoNfe('P2')).resolves.toBeNull()
  })
})
