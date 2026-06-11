import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'

import { obterRelatorioFaturamento } from './fiscalSimplesService'

describe('fiscalSimplesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca relatório de faturamento com filtros', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        cnpj: '07284171000139',
        filtros: {},
        resumo: {
          valor_total: '1000.00',
          quantidade_documentos: 2,
          ticket_medio: '500.00',
          clientes_distintos: 1,
          meses_no_periodo: 12,
        },
        por_mes: [],
        por_cliente: [],
        por_anexo: [],
        por_objetivo: [],
        documentos: [],
      },
    })

    const relatorio = await obterRelatorioFaturamento({
      data_inicio: '2025-07-01',
      data_fim: '2026-06-30',
      cliente: 'Alpha',
      objetivo_saida: 'VENDA_PRODUTO',
      anexo_simples: 'I',
      tipo_documento: 'NFE_PRODUTO',
      top_clientes: 15,
    })

    expect(relatorio.resumo.quantidade_documentos).toBe(2)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/relatorios/faturamento/', {
      params: {
        data_inicio: '2025-07-01',
        data_fim: '2026-06-30',
        cliente: 'Alpha',
        objetivo_saida: 'VENDA_PRODUTO',
        anexo_simples: 'I',
        tipo_documento: 'NFE_PRODUTO',
        top_clientes: 15,
      },
    })
  })

  it('omite filtros vazios na query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        cnpj: '07284171000139',
        filtros: {},
        resumo: {
          valor_total: '0',
          quantidade_documentos: 0,
          ticket_medio: '0',
          clientes_distintos: 0,
          meses_no_periodo: 1,
        },
        por_mes: [],
        por_cliente: [],
        por_anexo: [],
        por_objetivo: [],
        documentos: [],
      },
    })

    await obterRelatorioFaturamento({
      data_inicio: '2026-01-01',
      data_fim: '2026-06-30',
    })

    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/relatorios/faturamento/', {
      params: {
        data_inicio: '2026-01-01',
        data_fim: '2026-06-30',
      },
    })
  })
})
