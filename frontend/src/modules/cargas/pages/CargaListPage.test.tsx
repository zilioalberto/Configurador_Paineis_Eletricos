import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())

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
  useRecalcularDimensionamentoMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/modules/cargas/hooks/useCargaMutations', () => ({
  useDeleteCargaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: vi.fn() }),
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
})
