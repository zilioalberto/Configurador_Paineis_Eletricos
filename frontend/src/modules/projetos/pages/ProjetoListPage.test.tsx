import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import ProjetoListPage from '@/modules/projetos/pages/ProjetoListPage'

import { projetoListaLinha } from './projetoListaTestFactories'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())
const refetchMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoMutations', () => ({
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

function renderLista() {
  render(
    <MemoryRouter>
      <ProjetoListPage />
    </MemoryRouter>
  )
}

describe('ProjetoListPage', () => {
  it('oculta botao novo projeto sem permissao de criacao', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    mockListaQuery([])

    renderLista()

    expect(screen.queryByRole('link', { name: /Novo Projeto/i })).not.toBeInTheDocument()
  })

  it('exibe botao novo projeto e permite atualizar lista', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.criar', 'projeto.visualizar'],
      },
    })
    mockListaQuery([])

    renderLista()

    expect(screen.getByRole('link', { name: /Novo Projeto/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }))
    expect(refetchMock).toHaveBeenCalled()
  })

  it('filtra projetos pelo nome do responsável', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.visualizar'],
      },
    })
    mockListaQuery([
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
    ])

    renderLista()

    fireEvent.change(screen.getByLabelText(/Buscar por responsável/i), {
      target: { value: 'tais' },
    })

    expect(screen.getByText('Projeto A')).toBeInTheDocument()
    expect(screen.queryByText('Projeto B')).not.toBeInTheDocument()
  })

  it('filtra projetos por código, nome, cliente e status', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.visualizar'],
      },
    })
    mockListaQuery([
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
    ])

    renderLista()

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
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.visualizar'],
      },
    })
    mockListaQuery([
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
    ])

    renderLista()

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
