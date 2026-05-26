import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarContext,
} from '@/components/layout/AppPageToolbarContext'
import ProjetoListPage from '@/modules/configurador_paineis/projetos/pages/ProjetoListPage'
import { authUser } from '@/test/factories/authUser'

import { projetoListaLinha } from './projetoListaTestFactories'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())
const refetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoMutations', () => ({
  useDeleteProjetoMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: ({ show, onConfirm }: { show: boolean; onConfirm: () => void }) =>
    show ? <button onClick={onConfirm}>confirmar-exclusao</button> : null,
  useToast: () => ({ showToast: vi.fn() }),
}))

function mockListaQuery(data: unknown[]) {
  useProjetoListQueryMock.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: refetchMock,
  })
}

function AppPageToolbarHost() {
  const { toolbar } = useAppPageToolbarContext()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function renderLista() {
  render(
    <MemoryRouter>
      <AppPageToolbarProvider>
        <AppPageToolbarHost />
        <ProjetoListPage />
      </AppPageToolbarProvider>
    </MemoryRouter>
  )
}

function setupProjetoListPage({
  permissoes = [],
  data = [],
}: {
  permissoes?: string[]
  data?: unknown[]
}) {
  useAuthMock.mockReturnValue({ user: authUser(permissoes) })
  mockListaQuery(data)
  renderLista()
}

describe('ProjetoListPage', () => {
  it('oculta botao nova configuracao sem permissao de criacao', () => {
    setupProjetoListPage({})

    expect(screen.queryByRole('link', { name: /Nova configuração/i })).not.toBeInTheDocument()
  })

  it('exibe botao nova configuracao com permissao de criacao', () => {
    setupProjetoListPage({ permissoes: ['projeto.criar', 'projeto.visualizar'] })

    expect(screen.getByRole('link', { name: /Nova configuração/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Atualizar/i })).not.toBeInTheDocument()
  })

  it('filtra projetos pelo nome do responsável', () => {
    setupProjetoListPage({
      permissoes: ['projeto.visualizar'],
      data: [
      projetoListaLinha({
        id: 'p1',
        codigo: '04001-26',
        nome: 'Projeto A',
        responsavel_nome: 'Tais',
        status: 'EM_ANDAMENTO',
      }),
      projetoListaLinha({
        id: 'p2',
        codigo: '04002-26',
        nome: 'Projeto B',
        responsavel_nome: 'Matheus',
        status: 'EM_ANDAMENTO',
      }),
    ],
    })

    fireEvent.change(screen.getByLabelText(/Buscar por responsável/i), {
      target: { value: 'tais' },
    })

    expect(screen.getByText('Projeto A')).toBeInTheDocument()
    expect(screen.queryByText('Projeto B')).not.toBeInTheDocument()
  })

  it('filtra projetos por código, nome, cliente e status', () => {
    setupProjetoListPage({
      permissoes: ['projeto.visualizar'],
      data: [
      projetoListaLinha({
        id: 'p1',
        codigo: '04001-26',
        nome: 'Projeto Alfa',
        cliente: 'Cliente A',
        responsavel_nome: 'Tais',
        status: 'EM_ANDAMENTO',
      }),
      projetoListaLinha({
        id: 'p2',
        codigo: '04002-26',
        nome: 'Projeto Beta',
        cliente: 'Cliente B',
        responsavel_nome: 'Matheus',
        status: 'FINALIZADO',
      }),
    ],
    })

    fireEvent.change(screen.getByLabelText(/Buscar por código/i), {
      target: { value: '04001' },
    })
    expect(screen.getByText('Projeto Alfa')).toBeInTheDocument()
    expect(screen.queryByText('Projeto Beta')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Buscar por código/i), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText(/Buscar por nome/i), {
      target: { value: 'beta' },
    })
    expect(screen.getByText('Projeto Beta')).toBeInTheDocument()
    expect(screen.queryByText('Projeto Alfa')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Buscar por nome/i), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText(/Buscar por cliente/i), {
      target: { value: 'cliente a' },
    })
    expect(screen.getByText('Projeto Alfa')).toBeInTheDocument()
    expect(screen.queryByText('Projeto Beta')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Buscar por cliente/i), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText(/Filtrar por status/i), {
      target: { value: 'FINALIZADO' },
    })
    expect(screen.getByText('Projeto Beta')).toBeInTheDocument()
    expect(screen.queryByText('Projeto Alfa')).not.toBeInTheDocument()
  })

  it('limpa todos os filtros ao clicar em limpar filtros', () => {
    setupProjetoListPage({
      permissoes: ['projeto.visualizar'],
      data: [
      projetoListaLinha({
        id: 'p1',
        codigo: '04001-26',
        nome: 'Projeto Alfa',
        cliente: 'Cliente A',
        responsavel_nome: 'Tais',
        status: 'EM_ANDAMENTO',
      }),
      projetoListaLinha({
        id: 'p2',
        codigo: '04002-26',
        nome: 'Projeto Beta',
        cliente: 'Cliente B',
        responsavel_nome: 'Matheus',
        status: 'FINALIZADO',
      }),
    ],
    })

    fireEvent.change(screen.getByLabelText(/Buscar por nome/i), {
      target: { value: 'beta' },
    })
    fireEvent.change(screen.getByLabelText(/Filtrar por status/i), {
      target: { value: 'FINALIZADO' },
    })
    expect(screen.getByText('Projeto Beta')).toBeInTheDocument()
    expect(screen.queryByText('Projeto Alfa')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }))

    expect((screen.getByLabelText(/Buscar por nome/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/Filtrar por status/i) as HTMLSelectElement).value).toBe('')
    expect(screen.getByText('Projeto Alfa')).toBeInTheDocument()
    expect(screen.getByText('Projeto Beta')).toBeInTheDocument()
  })
})
