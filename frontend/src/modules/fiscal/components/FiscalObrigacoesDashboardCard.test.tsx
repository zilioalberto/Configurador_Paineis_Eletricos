import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const obterDashboardObrigacoesMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalObrigacoesService', () => ({
  obterDashboardObrigacoes: () => obterDashboardObrigacoesMock(),
}))

import FiscalObrigacoesDashboardCard from './FiscalObrigacoesDashboardCard'

function renderCard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FiscalObrigacoesDashboardCard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FiscalObrigacoesDashboardCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza os totais e os alertas do dashboard', async () => {
    obterDashboardObrigacoesMock.mockResolvedValue({
      total_pendente: '1000.00',
      total_vence_7_dias: '250.00',
      quantidade_vence_7_dias: 2,
      total_vencido: '90.00',
      quantidade_vencidas: 1,
      alertas: ['DAS vence em 3 dias'],
    })

    renderCard()

    expect(await screen.findByText('Obrigações fiscais mensais')).toBeInTheDocument()
    expect(screen.getByText('Total pendente')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('DAS vence em 3 dias')
    expect(screen.getByRole('link', { name: 'Gerir impostos' })).toBeInTheDocument()
  })

  it('não exibe alerta quando não há alertas', async () => {
    obterDashboardObrigacoesMock.mockResolvedValue({
      total_pendente: '0.00',
      total_vence_7_dias: '0.00',
      quantidade_vence_7_dias: 0,
      total_vencido: '0.00',
      quantidade_vencidas: 0,
      alertas: [],
    })

    renderCard()

    expect(await screen.findByText('Obrigações fiscais mensais')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
