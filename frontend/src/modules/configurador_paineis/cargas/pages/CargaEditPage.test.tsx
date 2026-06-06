import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const useCargaDetailQueryMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaDetailQuery', () => ({
  useCargaDetailQuery: () => useCargaDetailQueryMock(),
}))

import CargaEditPage from '@/modules/configurador_paineis/cargas/pages/CargaEditPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function renderWithId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/configurador/cargas/${id}/editar`]}>
      <Routes>
        <Route path="/configurador/cargas/:id/editar" element={<CargaEditPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper }
  )
}

describe('CargaEditPage', () => {
  it('redireciona para listagem com drawer de edição', async () => {
    navigate.mockClear()
    useCargaDetailQueryMock.mockReturnValue({
      data: { id: 'carga-1', projeto: 'p1' },
      isPending: false,
      isError: false,
    })

    renderWithId('carga-1')

    expect(screen.getByText(/Abrindo edição de carga/i)).toBeInTheDocument()
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        '/configurador/cargas?projeto=p1&editar=carga-1',
        { replace: true }
      )
    )
  })

  it('redireciona para listagem quando carga não carrega', async () => {
    navigate.mockClear()
    useCargaDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    })

    renderWithId('carga-x')

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/configurador/cargas', { replace: true })
    )
  })
})
