import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRelatorioFaturamentoQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useRelatorioFaturamentoQuery', () => ({
  useRelatorioFaturamentoQuery: (...args: unknown[]) => useRelatorioFaturamentoQueryMock(...args),
}))

import RelatorioFaturamentoPage from './RelatorioFaturamentoPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RelatorioFaturamentoPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RelatorioFaturamentoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRelatorioFaturamentoQueryMock.mockReturnValue({
      data: {
        cnpj: '07284171000139',
        filtros: { data_inicio: '2025-07-01', data_fim: '2026-06-30', top_clientes: 15 },
        resumo: {
          valor_total: '15000.00',
          quantidade_documentos: 3,
          ticket_medio: '5000.00',
          clientes_distintos: 2,
          meses_no_periodo: 12,
        },
        por_mes: [
          {
            competencia: '2026-06',
            valor_nfes: '10000.00',
            valor_ajuste: '0.00',
            valor_total: '10000.00',
            quantidade_documentos: 2,
            por_anexo: { I: '10000.00' },
          },
        ],
        por_cliente: [
          {
            cnpj_destinatario: '99888777000166',
            nome_destinatario: 'Cliente Alpha',
            valor_total: '10000.00',
            quantidade_documentos: 2,
            participacao_percentual: '66.67',
          },
        ],
        por_anexo: [{ anexo: 'I', valor_total: '10000.00' }],
        por_objetivo: [{ objetivo_saida: 'VENDA_PRODUTO', valor_total: '10000.00' }],
        documentos: [
          {
            id: 1,
            numero: '100',
            serie: '1',
            data_emissao: '2026-06-10',
            tipo_documento: 'NFE_PRODUTO',
            valor_total: '5000.00',
            cnpj_destinatario: '99888777000166',
            nome_destinatario: 'Cliente Alpha',
            cfop_predominante: '5102',
            anexo_simples: 'I',
            objetivo_saida: 'VENDA_PRODUTO',
          },
        ],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
  })

  it('renderiza titulo e cards de resumo', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /Faturamento e clientes/i })).toBeInTheDocument()
    expect(screen.getByText('Faturamento total')).toBeInTheDocument()
    expect(screen.getByText('Clientes distintos')).toBeInTheDocument()
    expect(screen.getAllByText('Cliente Alpha').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Top clientes')).toBeInTheDocument()
    expect(screen.getByText('Faturamento por mês')).toBeInTheDocument()
    expect(screen.getByLabelText('Anexo Simples')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de documento')).toBeInTheDocument()
  })

  it('mostra estado de carregamento', () => {
    useRelatorioFaturamentoQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/Carregando relatório/i)).toBeInTheDocument()
  })
})
