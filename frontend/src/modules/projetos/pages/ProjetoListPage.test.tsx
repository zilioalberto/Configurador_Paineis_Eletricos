import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

import ProjetoListPage from '@/modules/projetos/pages/ProjetoListPage'

describe('ProjetoListPage', () => {
  it('oculta botao novo projeto sem permissao de criacao', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    useProjetoListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    })

    render(
      <MemoryRouter>
        <ProjetoListPage />
      </MemoryRouter>
    )

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
    useProjetoListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: refetchMock,
    })

    render(
      <MemoryRouter>
        <ProjetoListPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /Novo Projeto/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }))
    expect(refetchMock).toHaveBeenCalled()
  })
})
