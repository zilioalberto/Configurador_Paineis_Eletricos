import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useServicoListQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
  ConfirmModal: ({
    show,
    onConfirm,
    onCancel,
  }: {
    show: boolean
    onConfirm: () => void
    onCancel: () => void
  }) =>
    show ? (
      <div>
        <button type="button" onClick={onConfirm}>
          Confirmar exclusão
        </button>
        <button type="button" onClick={onCancel}>
          Cancelar exclusão
        </button>
      </div>
    ) : null,
}))

vi.mock('../hooks/useServicoListQuery', () => ({
  useServicoListQuery: (...args: unknown[]) => useServicoListQueryMock(...args),
}))

vi.mock('../hooks/useServicoMutations', () => ({
  useDeleteServicoMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

import ServicoListPage from './ServicoListPage'

describe('ServicoListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useServicoListQueryMock.mockReturnValue({
      data: {
        items: [{ id: 's-1', codigo: 'SRV', descricao: 'Serviço', categoria: '', unidade_medida: 'UN', custo_referencia: '10', ativo: true }],
        total: 1,
        page: 1,
        pageSize: 50,
        hasNext: false,
        hasPrevious: false,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    mutateAsyncMock.mockResolvedValue(undefined)
  })

  it('lista serviços e confirma exclusão', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <ServicoListPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('SRV')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /excluir/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledWith('s-1'))
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })
})
