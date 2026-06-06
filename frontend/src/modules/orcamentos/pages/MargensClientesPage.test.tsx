import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const listarMargensMock = vi.hoisted(() => vi.fn())
const listarClientesMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ user: authUser(['orcamento.editar']) }),
}))

vi.mock('../services/orcamentosApi', () => ({
  listarMargensClientes: (...args: unknown[]) => listarMargensMock(...args),
  listarClientesOrcamento: (...args: unknown[]) => listarClientesMock(...args),
  criarMargemCliente: vi.fn(),
  atualizarMargemCliente: vi.fn(),
}))

import MargensClientesPage from './MargensClientesPage'

describe('MargensClientesPage', () => {
  beforeEach(() => {
    listarMargensMock.mockResolvedValue([
      {
        id: 'm-1',
        cliente: 'c-1',
        cliente_nome: 'Cliente A',
        margem_produtos_percentual: '10',
        margem_servicos_percentual: '20',
      },
    ])
    listarClientesMock.mockResolvedValue([
      {
        id: 'c-2',
        documento: '1',
        razao_social: 'Cliente B',
        eh_cliente: true,
      },
    ])
  })

  it('lista margens configuradas', async () => {
    render(
      <MemoryRouter>
        <MargensClientesPage />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Cliente A')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Margens padrão por cliente' })).toBeInTheDocument()
  })

  it('destaca cliente vindo da proposta pela query string', async () => {
    render(
      <MemoryRouter initialEntries={['/orcamentos/margens-clientes?cliente=c-1']}>
        <MargensClientesPage />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getAllByText('Cliente A').length).toBeGreaterThan(0))
    expect(screen.getByText(/Cliente selecionado:/)).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Cliente A' }).closest('tr')).toHaveClass(
      'table-primary'
    )
  })
})
