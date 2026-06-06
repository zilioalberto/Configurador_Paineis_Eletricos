import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useControleNsuQueryMock = vi.hoisted(() => vi.fn())
const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useControleNsuQuery', () => ({
  useControleNsuQuery: (...args: unknown[]) => useControleNsuQueryMock(...args),
}))

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

import ControleNsuPage from './ControleNsuPage'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ControleNsuPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ControleNsuPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFiscalConfigQueryMock.mockReturnValue({ data: { cnpj_empresa: '11222333000199' } })
    useControleNsuQueryMock.mockReturnValue({
      data: {
        cnpj: '11222333000199',
        ultimo_nsu: '100',
        max_nsu: '200',
        ultimo_cstat: '138',
        ultimo_motivo: 'OK',
        ultima_consulta: '2026-01-01T10:00:00Z',
        bloqueado_ate: null,
      },
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza título e consulta NSU automaticamente', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /controle nsu/i })).toBeInTheDocument()
    await waitFor(() =>
      expect(useControleNsuQueryMock).toHaveBeenCalledWith('11222333000199', true)
    )
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('consulta CNPJ informado manualmente', async () => {
    useFiscalConfigQueryMock.mockReturnValue({ data: undefined })
    useControleNsuQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage()
    fireEvent.change(screen.getByLabelText(/cnpj da empresa/i), {
      target: { value: '11.222.333/0001-99' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /consultar/i }).closest('form')!)

    await waitFor(() =>
      expect(useControleNsuQueryMock).toHaveBeenCalledWith('11222333000199', true)
    )
  })
})
