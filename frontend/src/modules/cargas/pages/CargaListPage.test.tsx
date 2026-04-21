import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const recalcMutateAsyncMock = vi.hoisted(() => vi.fn(() => Promise.resolve({})))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/dimensionamento/hooks/useRecalcularDimensionamentoMutation', () => ({
  useRecalcularDimensionamentoMutation: () => ({
    mutateAsync: recalcMutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/cargas/hooks/useCargaMutations', () => ({
  useDeleteCargaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: showToastMock }),
}))

import CargaListPage from '@/modules/cargas/pages/CargaListPage'

describe('CargaListPage', () => {
  it('oculta nova carga quando usuario nao pode editar materiais', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CargaListPage />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: /Nova carga/i })).not.toBeInTheDocument()
  })

  it('exibe aviso quando somente projetos finalizados existem', () => {
    showToastMock.mockClear()
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['material.editar_lista'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [{ id: 'p1', codigo: 'P1', nome: 'Projeto 1', status: 'FINALIZADO' }],
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/cargas?projeto=p1']}>
        <CargaListPage />
      </MemoryRouter>
    )

    expect(
      screen.getByText(/Projetos finalizados não aparecem aqui para edição de cargas/i)
    ).toBeInTheDocument()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning' })
    )
  })

  it('exibe CTA de criar projeto quando lista esta vazia e usuario pode criar', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['projeto.criar'],
      },
    })
    useProjetoListQueryMock.mockReturnValue({ data: [], isPending: false })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <CargaListPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /Criar projeto/i })).toBeInTheDocument()
  })

  it('mostra estados de carregamento e erro da listagem', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [{ id: 'p2', codigo: 'P2', nome: 'Projeto 2', status: 'EM_ANDAMENTO' }],
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    const { rerender } = render(
      <MemoryRouter initialEntries={['/cargas?projeto=p2']}>
        <CargaListPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Carregando cargas/i)).toBeInTheDocument()

    useCargaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: true,
      error: new Error('Falha cargas'),
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: true,
      error: new Error('Falha resumo'),
      refetch: vi.fn(),
    })
    rerender(
      <MemoryRouter initialEntries={['/cargas?projeto=p2']}>
        <CargaListPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Falha cargas')).toBeInTheDocument()
    expect(screen.getByText('Falha resumo')).toBeInTheDocument()
  })

  it('executa recálculo manual e mostra resumo do dimensionamento', async () => {
    recalcMutateAsyncMock.mockClear()
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
      data: [{ id: 'p3', codigo: 'P3', nome: 'Projeto 3', status: 'EM_ANDAMENTO' }],
      isPending: false,
    })
    useCargaListQueryMock.mockReturnValue({
      data: [{ id: 'c1', atualizado_em: '2026-01-01T10:00:00.000Z' }],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        corrente_total_painel_a: '20.5',
        possui_seccionamento: true,
        tipo_seccionamento_display: 'Disjuntor',
        atualizado_em: '2026-01-01T10:05:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/cargas?projeto=p3']}>
        <CargaListPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Corrente total de entrada/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Recalcular$/i }))
    await waitFor(() => expect(recalcMutateAsyncMock).toHaveBeenCalled())
  })
})
