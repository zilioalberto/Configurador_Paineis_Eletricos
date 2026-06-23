import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const obterDashboardObrigacoesMock = vi.hoisted(() => vi.fn())
const listarPacotesObrigacoesMock = vi.hoisted(() => vi.fn())
const criarPacoteObrigacaoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ user: authUser(['fiscal.editar']) }),
}))

vi.mock('../services/fiscalObrigacoesService', () => ({
  obterDashboardObrigacoes: () => obterDashboardObrigacoesMock(),
  listarPacotesObrigacoes: () => listarPacotesObrigacoesMock(),
  criarPacoteObrigacao: (...args: unknown[]) => criarPacoteObrigacaoMock(...args),
}))

import ObrigacoesFiscaisListPage from './ObrigacoesFiscaisListPage'

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ObrigacoesFiscaisListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ObrigacoesFiscaisListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterDashboardObrigacoesMock.mockResolvedValue({
      total_pendente: '1000.00',
      total_vence_7_dias: '250.00',
      total_vencido: '90.00',
    })
    listarPacotesObrigacoesMock.mockResolvedValue([
      {
        public_id: 'pac-1',
        competencia: '2026-03',
        pacote_completo: true,
        total_obrigacoes: 4,
        total_pendente: '500.00',
      },
      {
        public_id: 'pac-2',
        competencia: '2026-02',
        pacote_completo: false,
        total_obrigacoes: 2,
        total_pendente: '0.00',
      },
    ])
  })

  it('renderiza dashboard e tabela de competências', async () => {
    renderPage()

    expect(await screen.findByText('Completo')).toBeInTheDocument()
    expect(screen.getByText('Incompleto')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Abrir' })).toHaveLength(2)
    expect(screen.getByText('Próximos 7 dias')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há competências', async () => {
    listarPacotesObrigacoesMock.mockResolvedValue([])

    renderPage()

    expect(
      await screen.findByText(/Nenhuma competência cadastrada/i),
    ).toBeInTheDocument()
  })

  it('cria um pacote para a competência informada', async () => {
    criarPacoteObrigacaoMock.mockResolvedValue({ public_id: 'novo' })

    renderPage()
    await screen.findByText('Completo')

    fireEvent.change(screen.getByLabelText('Nova competência'), {
      target: { value: '2026-05' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pacote' }))

    await waitFor(() => expect(criarPacoteObrigacaoMock).toHaveBeenCalledWith('2026-05'))
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', title: 'Competência criada' }),
    )
  })

  it('exibe toast de erro quando a criação falha', async () => {
    criarPacoteObrigacaoMock.mockRejectedValue(new Error('boom'))

    renderPage()
    await screen.findByText('Completo')

    fireEvent.click(screen.getByRole('button', { name: 'Criar pacote' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger', title: 'Erro' }),
      ),
    )
  })
})
