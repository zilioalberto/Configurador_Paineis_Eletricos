import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const showToastFn = vi.hoisted(() => vi.fn())
const mutateAsync = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ projeto: 'p-editavel' }))
)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'a@test.com',
      tipo_usuario: 'ADMIN',
      permissoes: [],
    },
  }),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastFn }),
}))

const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/cargas/hooks/useCargaMutations', () => ({
  useCreateCargaMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

import CargaCreatePage from '@/modules/cargas/pages/CargaCreatePage'

const projetoEditavel = {
  id: 'p-editavel',
  nome: 'Proj',
  codigo: 'P-1',
  status: 'EM_ANDAMENTO',
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/cargas/novo${search}`]}>
      <CargaCreatePage />
    </MemoryRouter>,
    { wrapper }
  )
}

describe('CargaCreatePage', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({ projeto: 'p-editavel' })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('mostra aviso quando não existem projetos', () => {
    showToastFn.mockClear()
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })
    renderPage()
    expect(
      screen.getByText(/É necessário ter pelo menos um projeto cadastrado/i)
    ).toBeInTheDocument()
  })

  it('mostra aviso quando todos os projetos estão finalizados', () => {
    useProjetoListQueryMock.mockReturnValue({
      data: [{ ...projetoEditavel, id: 'x', status: 'FINALIZADO' }],
      isPending: false,
    })
    renderPage()
    expect(
      screen.getByText(/Todos os projetos estão finalizados/i)
    ).toBeInTheDocument()
  })

  it('exibe formulário e submete criação', async () => {
    navigate.mockClear()
    mutateAsync.mockClear()
    showToastFn.mockClear()
    useProjetoListQueryMock.mockReturnValue({
      data: [projetoEditavel],
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage('?projeto=p-editavel')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Nova carga/i })).toBeInTheDocument()
    )

    fireEvent.change(screen.getByPlaceholderText(/M01/i), {
      target: { value: 'M01' },
    })
    fireEvent.change(document.querySelector('input[name="descricao"]')!, {
      target: { value: 'Motor principal' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar carga/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })

  it('mostra erro quando a API de criação falha', async () => {
    showToastFn.mockClear()
    mutateAsync.mockRejectedValueOnce(new Error('falha rede'))
    useProjetoListQueryMock.mockReturnValue({
      data: [projetoEditavel],
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage('?projeto=p-editavel')
    await screen.findByRole('heading', { name: /Nova carga/i })

    fireEvent.change(document.querySelector('input[name="descricao"]')!, {
      target: { value: 'Motor principal' },
    })
    fireEvent.change(screen.getByPlaceholderText(/M01/i), {
      target: { value: 'M01' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar carga/i }))

    await waitFor(() =>
      expect(showToastFn).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger' })
      )
    )
  })
})
