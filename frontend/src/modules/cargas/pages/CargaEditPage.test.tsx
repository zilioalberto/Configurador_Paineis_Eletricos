import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const showToastFn = vi.hoisted(() => vi.fn())
const mutateAsync = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ projeto: 'p1' }))
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

const useCargaDetailQueryMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/cargas/hooks/useCargaDetailQuery', () => ({
  useCargaDetailQuery: () => useCargaDetailQueryMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/cargas/hooks/useCargaMutations', () => ({
  useUpdateCargaMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

import CargaEditPage from '@/modules/cargas/pages/CargaEditPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const cargaApi = {
  id: 'carga-1',
  projeto: 'p1',
  tag: 'O01',
  descricao: 'Outro',
  tipo: 'OUTRO',
  quantidade: 1,
  ativo: true,
}

function renderWithId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/cargas/${id}/editar`]}>
      <Routes>
        <Route path="/cargas/:id/editar" element={<CargaEditPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper }
  )
}

describe('CargaEditPage', () => {
  it('mostra erro de carregamento e permite refetch', async () => {
    const refetch = vi.fn()
    useCargaDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('x'),
      refetch,
    })
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })

    renderWithId('c1')

    expect(await screen.findByText(/Não foi possível carregar esta carga/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('submete atualização com sucesso', async () => {
    navigate.mockClear()
    mutateAsync.mockClear()
    useCargaDetailQueryMock.mockReturnValue({
      data: cargaApi,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [
        {
          id: 'p1',
          nome: 'P',
          codigo: 'P-1',
          status: 'EM_ANDAMENTO',
        },
      ],
      isPending: false,
    })

    renderWithId('carga-1')

    await screen.findByRole('heading', { name: /Editar carga/i })

    fireEvent.change(document.querySelector('input[name="descricao"]')!, {
      target: { value: 'Motor atualizado' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar carga/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(navigate).toHaveBeenCalled())
  })
})
