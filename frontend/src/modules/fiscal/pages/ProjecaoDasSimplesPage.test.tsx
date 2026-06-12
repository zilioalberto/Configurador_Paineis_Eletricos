import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useProjecaoDasSimplesQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useProjecaoDasSimplesQuery', () => ({
  useProjecaoDasSimplesQuery: (...args: unknown[]) => useProjecaoDasSimplesQueryMock(...args),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

import ProjecaoDasSimplesPage from './ProjecaoDasSimplesPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProjecaoDasSimplesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProjecaoDasSimplesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProjecaoDasSimplesQueryMock.mockReturnValue({
      data: {
        cnpj: '07284171000139',
        competencia: '2026-06',
        data_referencia_rbt12: '2026-06-30',
        rbt12_total: '240000.00',
        fator_r: '0.28',
        anexo_servicos: 'III',
        receita_competencia: '20000.00',
        das_estimado_total: '1200.00',
        parcelas: [
          {
            anexo: 'I',
            receita_mes: '15000.00',
            rbt12_anexo: '180000.00',
            faixa: 2,
            aliquota_nominal: '0.07',
            aliquota_efetiva: '0.05',
            das_estimado: '900.00',
          },
        ],
        faturamento_mensal: [
          {
            competencia: '2026-06',
            valor_nfes: '20000.00',
            valor_ajuste: '0.00',
            valor_total: '20000.00',
            quantidade_nfes: 3,
            observacao_ajuste: '',
            por_anexo_bruto: { I: '15000.00' },
          },
        ],
        avisos: ['Conferir com contador.'],
        perfil: {
          id: 1,
          cnpj: '07284171000139',
          folha_salarios_12m: '50000.00',
          encargos_folha_12m: '12000.00',
          anexo_servicos_override: '',
          criado_em: '2026-01-01',
          atualizado_em: '2026-01-01',
        },
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza título e cards de projeção', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /projeção das — simples nacional/i })
    ).toBeInTheDocument()
    expect(screen.getByText('RBT12 total')).toBeInTheDocument()
    expect(screen.getByText('DAS estimado')).toBeInTheDocument()
    expect(screen.getByText('Conferir com contador.')).toBeInTheDocument()
    expect(screen.getByText('Parcelas por anexo')).toBeInTheDocument()
    expect(screen.getByText('Faturamento — últimos 12 meses')).toBeInTheDocument()
  })

  it('mostra estado de carregamento', () => {
    useProjecaoDasSimplesQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByText(/calculando/i)).toBeInTheDocument()
  })
})
