import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useRecalcularDimensionamentoMutation', () => ({
  useRecalcularDimensionamentoMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

import DimensionamentoPage from '@/modules/dimensionamento/pages/DimensionamentoPage'

describe('DimensionamentoPage', () => {
  it('nao exibe botao recalcular sem permissao de edicao de projeto', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DimensionamentoPage />
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /Recalcular/i })).not.toBeInTheDocument()
  })

  it('exibe aviso de projeto finalizado quando sem possibilidade de edicao', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.editar'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'FINALIZADO' }],
      isPending: false,
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dimensionamento?projeto=p1']}>
        <DimensionamentoPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Projeto finalizado: visualização somente leitura/i)).toBeInTheDocument()
  })

  it('renderiza resumo quando carregamento for bem sucedido', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.editar'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'EM_ANDAMENTO' }],
      isPending: false,
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        corrente_total_painel_a: '48.2',
        possui_seccionamento: true,
        tipo_seccionamento_display: 'Disjuntor',
        atualizado_em: '2026-01-20T10:20:30.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dimensionamento?projeto=p1']}>
        <DimensionamentoPage />
      </MemoryRouter>
    )

    expect(screen.getByText('48.2')).toBeInTheDocument()
    expect(screen.getByText('Disjuntor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recalcular/i })).toBeInTheDocument()
  })
})
