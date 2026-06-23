import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const useControleNsuQueryMock = vi.hoisted(() => vi.fn())
const useFiscalConfigQueryMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const atualizarControleNsuMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useControleNsuQuery', () => ({
  useControleNsuQuery: (...args: unknown[]) => useControleNsuQueryMock(...args),
}))

vi.mock('../hooks/useFiscalConfigQuery', () => ({
  useFiscalConfigQuery: () => useFiscalConfigQueryMock(),
}))

vi.mock('../components/SincronizarNfesSefazButton', () => ({
  default: () => <button type="button">Buscar NF-es na SEFAZ</button>,
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ user: authUser(['fiscal.editar']) }),
}))

vi.mock('../services/fiscalNfeService', () => ({
  atualizarControleNsu: (...args: unknown[]) => atualizarControleNsuMock(...args),
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

  it('não exibe mais o botão de zerar NSU (evita cStat 656)', async () => {
    renderPage()
    await screen.findByText('100')
    expect(screen.queryByRole('button', { name: /zerar/i })).not.toBeInTheDocument()
  })

  it('salva um NSU específico informado', async () => {
    atualizarControleNsuMock.mockResolvedValue({
      cnpj: '11222333000199',
      ultimo_nsu: '000000000000050',
      max_nsu: '000000000000050',
      ultimo_cstat: '138',
      ultimo_motivo: 'OK',
      ultima_consulta: '2026-01-01T10:00:00Z',
      bloqueado_ate: null,
    })

    renderPage()
    await screen.findByText('100')
    fireEvent.change(screen.getByLabelText(/definir último nsu/i), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar NSU' }))

    await waitFor(() => {
      expect(atualizarControleNsuMock).toHaveBeenCalledWith('11222333000199', '50')
    })
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
