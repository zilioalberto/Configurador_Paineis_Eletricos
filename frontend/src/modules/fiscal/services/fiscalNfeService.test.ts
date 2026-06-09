import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import {
  importarDocumentoEmitidoManual,
  listarNfesRecebidas,
  obterRelatorioNfes,
} from './fiscalNfeService'

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

  it('importa documento fiscal emitido', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        created: true,
        message: 'Importado',
        documento_id: 3,
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
      tipo_documento: 'NFSE_SERVICO',
      objetivo_saida: 'PRESTACAO_SERVICO',
    })
  })
})
