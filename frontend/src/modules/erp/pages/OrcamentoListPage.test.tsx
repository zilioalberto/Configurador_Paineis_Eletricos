import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarState,
} from '@/components/layout/AppPageToolbarContext'

const showToast = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const criarOrcamento = vi.hoisted(() => vi.fn())
const listarClientesOrcamento = vi.hoisted(() => vi.fn())
const listarContatosCliente = vi.hoisted(() => vi.fn())
const listarOrcamentos = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@test.com', tipo_usuario: 'ADMIN', permissoes: ['orcamento.criar'] },
  }),
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

function ToolbarProbe() {
  const toolbar = useAppPageToolbarState()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function renderPage() {
  render(
    <MemoryRouter>
      <AppPageToolbarProvider>
        <ToolbarProbe />
        <OrcamentoListPage />
      </AppPageToolbarProvider>
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

    expect(navigate).toHaveBeenCalledWith('/orcamentos/orc-1')
  })

  it('não exibe formulário de criação inline no topo', async () => {
    renderPage()

    await screen.findByText('ORC-001')
    expect(screen.queryByLabelText('Novo cliente')).not.toBeInTheDocument()
    expect(screen.queryByText(/Configurar margens por cliente/i)).not.toBeInTheDocument()
  })

  it('abre modal e cria orçamento pelo botão da toolbar', async () => {
    renderPage()

    await screen.findByText('ORC-001')
    const botoesCriar = screen.getAllByRole('button', { name: /Criar proposta/i })
    fireEvent.click(botoesCriar[0])

    const dialog = await screen.findByRole('dialog', { name: /Nova proposta/i })
    const clienteSelect = within(dialog).getByLabelText('Cliente')
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
      expect(within(dialog).getByLabelText('Contato')).toHaveValue('ct-1')
    })
    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: ' Novo painel ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Criar proposta$/i }))

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
    expect(navigate).toHaveBeenCalledWith('/orcamentos/orc-2')
  })

  it('mostra vazio e toast quando carregamentos falham', async () => {
    listarOrcamentos.mockRejectedValueOnce(new Error('lista'))

    renderPage()

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível carregar os orçamentos.' })
      )
    })
    expect(screen.getByText('Nenhum orçamento ainda.')).toBeInTheDocument()
  })

  it('avisa quando contatos ou criação falham', async () => {
    listarContatosCliente.mockRejectedValueOnce(new Error('contatos'))
    criarOrcamento.mockRejectedValueOnce(new Error('criar'))

    renderPage()

    await screen.findByText('ORC-001')
    fireEvent.click(screen.getAllByRole('button', { name: /Criar proposta/i })[0])

    const dialog = await screen.findByRole('dialog', { name: /Nova proposta/i })
    const clienteSelect = within(dialog).getByLabelText('Cliente')
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
    fireEvent.change(within(dialog).getByLabelText('Título'), {
      target: { value: 'Painel' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Criar proposta$/i }))

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
