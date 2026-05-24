import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToast = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const criarOrcamento = vi.hoisted(() => vi.fn())
const listarClientesOrcamento = vi.hoisted(() => vi.fn())
const listarContatosCliente = vi.hoisted(() => vi.fn())
const listarOrcamentos = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('../services/erpApi', () => ({
  criarOrcamento: (...args: unknown[]) => criarOrcamento(...args),
  listarClientesOrcamento: (...args: unknown[]) => listarClientesOrcamento(...args),
  listarContatosCliente: (...args: unknown[]) => listarContatosCliente(...args),
  listarOrcamentos: (...args: unknown[]) => listarOrcamentos(...args),
}))

import OrcamentoListPage from './OrcamentoListPage'

function renderPage() {
  render(
    <MemoryRouter>
      <OrcamentoListPage />
    </MemoryRouter>
  )
}

describe('OrcamentoListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarOrcamentos.mockResolvedValue([
      {
        id: 'orc-1',
        codigo: 'ORC-001',
        cliente_nome: 'Cliente Alfa',
        cliente_referencia: '',
        titulo: 'Painel principal',
        status: 'RASCUNHO',
        itens: [{ id: 'item-1' }],
      },
    ])
    listarClientesOrcamento.mockResolvedValue([
      { id: 'cli-1', razao_social: 'Cliente Alfa', documento: '123' },
    ])
    listarContatosCliente.mockResolvedValue([
      { id: 'ct-1', nome: 'Maria', email: 'maria@example.com', principal: true },
    ])
    criarOrcamento.mockResolvedValue({ id: 'orc-2' })
  })

  it('lista orçamentos e abre detalhe pelo código', async () => {
    renderPage()

    expect(await screen.findByText('ORC-001')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ORC-001/i }))

    expect(navigate).toHaveBeenCalledWith('/erp/orcamentos/orc-1')
  })

  it('cria orçamento com cliente e contato principal', async () => {
    renderPage()

    const clienteSelect = await screen.findByLabelText('Cliente')
    await waitFor(() => {
      expect(clienteSelect).not.toBeDisabled()
    })
    fireEvent.change(clienteSelect, {
      target: { value: 'cli-1' },
    })
    await waitFor(() => {
      expect(listarContatosCliente).toHaveBeenCalledWith('cli-1')
    })
    await waitFor(() => {
      expect(screen.getByLabelText('Contato do cliente')).toHaveValue('ct-1')
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: ' Novo painel ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar proposta/i }))

    await waitFor(() => {
      expect(criarOrcamento).toHaveBeenCalledWith({
        titulo: 'Novo painel',
        cliente: 'cli-1',
        contato_cliente: 'ct-1',
      })
    })
    expect(showToast).toHaveBeenCalledWith({
      variant: 'success',
      message: 'Orçamento criado.',
    })
    expect(navigate).toHaveBeenCalledWith('/erp/orcamentos/orc-2')
  })

  it('mostra vazio e toast quando carregamentos falham', async () => {
    listarOrcamentos.mockRejectedValueOnce(new Error('lista'))
    listarClientesOrcamento.mockRejectedValueOnce(new Error('clientes'))

    renderPage()

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível carregar os orçamentos.' })
      )
    })
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Não foi possível carregar os clientes cadastrados.' })
    )
    expect(screen.getByText('Nenhum orçamento ainda.')).toBeInTheDocument()
  })

  it('avisa quando contatos ou criação falham', async () => {
    listarContatosCliente.mockRejectedValueOnce(new Error('contatos'))
    criarOrcamento.mockRejectedValueOnce(new Error('criar'))

    renderPage()

    const clienteSelect = await screen.findByLabelText('Cliente')
    await waitFor(() => {
      expect(clienteSelect).not.toBeDisabled()
    })
    fireEvent.change(clienteSelect, {
      target: { value: 'cli-1' },
    })
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível carregar os contatos do cliente.' })
      )
    })
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Painel' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar proposta/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível criar o orçamento.' })
      )
    })
  })

  it('renderiza fallback de cliente sem nome', async () => {
    listarOrcamentos.mockResolvedValueOnce([
      {
        id: 'orc-3',
        codigo: 'ORC-003',
        cliente_nome: '',
        cliente_referencia: '',
        titulo: 'Sem cliente',
        status: 'ABERTO',
        itens: undefined,
      },
    ])

    renderPage()

    const row = (await screen.findByText('ORC-003')).closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getByText('—')).toBeInTheDocument()
    expect(within(row as HTMLTableRowElement).getByText('0')).toBeInTheDocument()
  })
})
