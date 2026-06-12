import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import {
  atualizarClassificacaoDocumentoEmitido,
  excluirDocumentoEmitido,
  importarDocumentoEmitidoManual,
  listarNfesEmitidas,
  listarNfesRecebidas,
  obterNfeEmitida,
  obterRelatorioNfes,
} from './fiscalNfeService'

describe('fiscalNfeService', () => {
  const publicId = '11111111-1111-4111-8111-111111111111'

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

  it('busca relatório de NF-es com filtros limpos', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        filtros: {},
        resumo: {
          tipo_movimento: 'ENTRADA',
          total_documentos: 1,
          valor_total: '52.50',
          por_objetivo: [],
        },
        documentos: [],
      },
    })
    const relatorio = await obterRelatorioNfes({
      tipo_movimento: 'ENTRADA',
      data_inicio: '2026-06-01',
      data_fim: '2026-06-30',
      cnpj_emitente: '12.345.678/0001-99',
      fornecedor: 'Fornecedor',
    })
    expect(relatorio.resumo.total_documentos).toBe(1)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/relatorios/nfes/', {
      params: {
        tipo_movimento: 'ENTRADA',
        data_inicio: '2026-06-01',
        data_fim: '2026-06-30',
        cnpj_emitente: '12345678000199',
        fornecedor: 'Fornecedor',
      },
    })
  })

  it('converte competência do relatório em período mensal', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        filtros: {},
        resumo: {
          tipo_movimento: 'SAIDA',
          total_documentos: 0,
          valor_total: '0',
          por_objetivo: [],
        },
        documentos: [],
      },
    })

    await obterRelatorioNfes({
      tipo_movimento: 'SAIDA',
      competencia: '2026-02',
    })

    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/relatorios/nfes/', {
      params: {
        tipo_movimento: 'SAIDA',
        data_inicio: '2026-02-01',
        data_fim: '2026-02-28',
      },
    })
  })

  it('lista emitidas filtrando por competência', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { count: 0, results: [], next: null, previous: null },
    })

    await listarNfesEmitidas({ competencia: '2026-06', cliente: 'Alpha' }, 1, 50)

    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfes-emitidas/', {
      params: {
        page: 1,
        page_size: 50,
        data_inicio: '2026-06-01',
        data_fim: '2026-06-30',
        cliente: 'Alpha',
      },
    })
  })

  it('busca detalhe da NF-e emitida', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { id: 12, numero: '200', xml_original: '<nfeProc />' },
    })

    const detalhe = await obterNfeEmitida(publicId)

    expect(detalhe.numero).toBe('200')
    expect(apiClient.get).toHaveBeenCalledWith(`/fiscal/nfes-emitidas/${publicId}/`)
  })

  it('exclui NF-e emitida importada', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined })

    await excluirDocumentoEmitido(publicId)

    expect(apiClient.delete).toHaveBeenCalledWith(`/fiscal/nfes-emitidas/${publicId}/`)
  })

  it('atualiza classificação da NF-e emitida', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { id: 12, incluir_faturamento: false, classificacao_origem: 'MANUAL' },
    })

    const detalhe = await atualizarClassificacaoDocumentoEmitido(publicId, {
      incluir_faturamento: false,
    })

    expect(detalhe.incluir_faturamento).toBe(false)
    expect(apiClient.patch).toHaveBeenCalledWith(
      `/fiscal/nfes-emitidas/${publicId}/classificacao/`,
      {
        incluir_faturamento: false,
      },
    )
  })

  it('importa documento fiscal emitido', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        created: true,
        message: 'Importado',
        documento_id: 3,
        documento_public_id: publicId,
        identificador: 'NFSE:1',
      },
    })
    const result = await importarDocumentoEmitidoManual({
      xml: '<CompNfse />',
      tipo_documento: 'NFSE_SERVICO',
      objetivo_saida: 'PRESTACAO_SERVICO',
    })
    expect(result.documento_id).toBe(3)
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes-emitidas/importar-manual/', {
      xml: '<CompNfse />',
      classificar_automaticamente: true,
      tipo_documento: 'NFSE_SERVICO',
      objetivo_saida: 'PRESTACAO_SERVICO',
    })
  })
})
