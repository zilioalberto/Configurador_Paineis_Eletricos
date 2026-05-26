import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

import CargaCreatePage from '@/modules/configurador_paineis/cargas/pages/CargaCreatePage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function renderCargaCreatePage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/configurador/cargas/novo${search}`]}>
      <CargaCreatePage />
    </MemoryRouter>,
    { wrapper }
  )
}

describe('CargaCreatePage', () => {
  beforeEach(() => {
    navigate.mockClear()
  })

  it('redireciona para listagem com modal aberto', async () => {
    renderCargaCreatePage('?projeto=p-editavel')
    expect(screen.getByText(/Abrindo cadastro de carga/i)).toBeInTheDocument()
    await waitFor(() => expect(navigate).toHaveBeenCalled())
    const destino = String(navigate.mock.calls[0][0])
    expect(destino).toMatch(/\/configurador\/cargas\?/)
    expect(destino).toMatch(/projeto=p-editavel/)
    expect(destino).toMatch(/novo=1/)
    expect(navigate.mock.calls[0][1]).toEqual(expect.objectContaining({ replace: true }))
  })
})
