import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const recalcMutateAsyncMock = vi.hoisted(() => vi.fn(() => Promise.resolve({})))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useRecalcularDimensionamentoMutation', () => ({
  useRecalcularDimensionamentoMutation: () => ({
    mutateAsync: recalcMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaMutations', () => ({
  useDeleteCargaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateCargaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: showToastMock }),
}))

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppPageToolbarProvider } from '@/components/layout/AppPageToolbarContext'
import CargaListPage from '@/modules/configurador_paineis/cargas/pages/CargaListPage'

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => ({
    data: undefined,
    isPending: false,
    isError: false,
  }),
}))

function mockCargaListContext({
  user = authUser(),
  projetos = [],
  cargas = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() },
  dimensionamento = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() },
}: {
  user?: ReturnType<typeof authUser>
  projetos?: unknown[]
  cargas?: {
    data: unknown[]
    isPending: boolean
    isError: boolean
    error: Error | null
    refetch: ReturnType<typeof vi.fn>
  }
  dimensionamento?: {
    data: unknown
    isPending: boolean
    isError: boolean
    error: Error | null
    refetch: ReturnType<typeof vi.fn>
  }
}) {
  useAuthMock.mockReturnValue({ user })
  useProjetoListQueryMock.mockReturnValue({ data: projetos, isPending: false })
  useCargaListQueryMock.mockReturnValue(cargas)
  useDimensionamentoQueryMock.mockReturnValue(dimensionamento)
}

function renderCargaListPage(initialEntry = '/cargas') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AppPageToolbarProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <CargaListPage />
        </MemoryRouter>
      </AppPageToolbarProvider>
    </QueryClientProvider>
  )
}

describe('CargaListPage', () => {
  it('oculta nova carga quando usuario nao pode editar materiais', () => {
    mockCargaListContext({
      projetos: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'EM_ANDAMENTO' }],
    })
    renderCargaListPage('/configurador/cargas?projeto=p1')

    expect(screen.queryByRole('link', { name: /Salvar cargas/i })).not.toBeInTheDocument()
  })

  it('redireciona e avisa quando projeto na URL está finalizado', () => {
    showToastMock.mockClear()
    mockCargaListContext({
      user: authUser(['material.editar_lista']),
      projetos: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'FINALIZADO' }],
    })
    renderCargaListPage('/cargas?projeto=p1')

    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringMatching(/finalizadas/i),
      })
    )
    expect(screen.queryByText(/Cargas cadastradas/i)).not.toBeInTheDocument()
  })

  it('exibe CTA de criar configuracao quando lista esta vazia e usuario pode criar', () => {
    mockCargaListContext({ user: authUser(['projeto.criar']) })
    renderCargaListPage()

    expect(screen.getByRole('link', { name: /Criar configuração/i })).toBeInTheDocument()
  })

  it('abre modal de nova carga ao clicar no botão', () => {
    mockCargaListContext({
      user: authUser(['material.editar_lista']),
      projetos: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'EM_ANDAMENTO' }],
    })
    renderCargaListPage('/configurador/cargas?projeto=p1')

    fireEvent.click(screen.getByRole('button', { name: /Nova carga/i }))

    expect(screen.getByRole('dialog', { name: /Nova carga/i })).toBeInTheDocument()
  })

  it('mostra estados de carregamento e erro da listagem', () => {
    mockCargaListContext({
      projetos: [{ id: 'p2', codigo: 'P2', nome: 'Projeto 2', status: 'EM_ANDAMENTO' }],
      cargas: { data: [], isPending: true, isError: false, error: null, refetch: vi.fn() },
      dimensionamento: { data: null, isPending: true, isError: false, error: null, refetch: vi.fn() },
    })
    const { rerender } = renderCargaListPage('/cargas?projeto=p2')
    expect(screen.getByText(/Carregando cargas/i)).toBeInTheDocument()

    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: true,
      error: new Error('Falha cargas'),
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: true,
      error: new Error('Falha resumo'),
      refetch: vi.fn(),
    })
    const qc2 = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    rerender(
      <QueryClientProvider client={qc2}>
        <AppPageToolbarProvider>
          <MemoryRouter initialEntries={['/configurador/cargas?projeto=p2']}>
            <CargaListPage />
          </MemoryRouter>
        </AppPageToolbarProvider>
      </QueryClientProvider>
    )

    expect(screen.getByText('Falha cargas')).toBeInTheDocument()
    expect(screen.getByText('Falha resumo')).toBeInTheDocument()
  })

  it('mostra resumo do dimensionamento sem botoes de acao no card', () => {
    mockCargaListContext({
      user: authUser(['projeto.editar']),
      projetos: [{ id: 'p3', codigo: 'P3', nome: 'Projeto 3', status: 'EM_ANDAMENTO' }],
      cargas: {
        data: [{ id: 'c1', atualizado_em: '2026-01-01T10:00:00.000Z' }],
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
      dimensionamento: {
        data: {
          corrente_total_painel_a: '20.5',
          possui_seccionamento: true,
          tipo_seccionamento_display: 'Disjuntor',
          atualizado_em: '2026-01-01T10:05:00.000Z',
        },
        isPending: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      },
    })
    renderCargaListPage('/configurador/cargas?projeto=p3')

    expect(screen.getByText(/Corrente total de entrada/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recalcular/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Revisar condutores/i })).not.toBeInTheDocument()
  })
})
