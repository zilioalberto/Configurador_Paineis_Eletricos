import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const showToastFn = vi.hoisted(() => vi.fn())
const mutateAsync = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ id: 'p99', nome: 'Atualizado' }))
)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastFn }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@test.com', tipo_usuario: 'ADMIN', permissoes: [] },
  }),
}))

vi.mock('@/modules/projetos/services/projetoService', () => ({
  listarResponsaveisProjeto: vi.fn(() => Promise.resolve([])),
}))

const useProjetoDetailQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => useProjetoDetailQueryMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoMutations', () => ({
  useUpdateProjetoMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

import ProjetoEditPage from '@/modules/projetos/pages/ProjetoEditPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const projetoMinimo = {
  id: 'p99',
  codigo: '099-26',
  nome: 'Nome',
  descricao: '',
  cliente: '',
  status: 'EM_ANDAMENTO',
  tipo_painel: 'AUTOMACAO',
  tipo_corrente: 'CA',
  tensao_nominal: 380,
  numero_fases: 3,
  frequencia: 60,
  possui_neutro: true,
  possui_terra: true,
  tipo_conexao_alimentacao_potencia: 'BORNE',
  tipo_conexao_alimentacao_neutro: 'BORNE',
  tipo_conexao_alimentacao_terra: 'BORNE',
  tipo_corrente_comando: 'CA',
  tensao_comando: 24,
  possui_plc: false,
  possui_ihm: false,
  possui_switches: false,
  possui_plaqueta_identificacao: false,
  possui_faixa_identificacao: false,
  possui_adesivo_alerta: false,
  possui_adesivos_tensao: false,
  possui_climatizacao: false,
  tipo_climatizacao: 'VENTILADOR',
  fator_demanda: '1.00',
  possui_seccionamento: false,
  tipo_seccionamento: 'NENHUM',
  responsavel: null,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/projetos/p99/editar']}>
      <Routes>
        <Route path="/projetos/:id/editar" element={<ProjetoEditPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper }
  )
}

function mockProjetoDetailQuery(
  overrides: Partial<{
    data: unknown
    isPending: boolean
    isError: boolean
    error: unknown
    refetch: ReturnType<typeof vi.fn>
  }>
) {
  useProjetoDetailQueryMock.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  })
}

describe('ProjetoEditPage', () => {
  it('exibe aviso quando id não é informado na rota', async () => {
    mockProjetoDetailQuery({})
    render(
      <MemoryRouter initialEntries={['/projetos/editar']}>
        <Routes>
          <Route path="/projetos/editar" element={<ProjetoEditPage />} />
        </Routes>
      </MemoryRouter>,
      { wrapper }
    )

    expect(await screen.findByText(/Projeto não informado/i)).toBeInTheDocument()
  })

  it('mostra estado de carregamento do projeto', async () => {
    mockProjetoDetailQuery({ isPending: true })
    renderPage()
    expect(await screen.findByText(/Carregando dados do projeto/i)).toBeInTheDocument()
  })

  it('mostra erro de carregamento', async () => {
    const refetch = vi.fn()
    mockProjetoDetailQuery({ isError: true, error: new Error('falhou'), refetch })
    renderPage()
    expect(
      await screen.findByText(/Não foi possível carregar os dados deste projeto/i)
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('carrega formulário e submete atualização', async () => {
    navigate.mockClear()
    mutateAsync.mockClear()
    mockProjetoDetailQuery({ data: projetoMinimo })
    renderPage()

    await screen.findByRole('heading', { name: /Editar Projeto/i })

    fireEvent.change(document.querySelector('input[name="nome"]')!, {
      target: { value: 'Novo nome' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar projeto/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
