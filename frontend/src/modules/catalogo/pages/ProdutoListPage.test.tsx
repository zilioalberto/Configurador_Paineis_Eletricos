import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const useProdutoListQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoListQuery', () => ({
  useProdutoListQuery: () => useProdutoListQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoMutations', () => ({
  useDeleteProdutoMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: vi.fn() }),
}))

import ProdutoListPage from '@/modules/catalogo/pages/ProdutoListPage'

function setupProdutoListPage() {
  useAuthMock.mockReturnValue({ user: authUser() })
  useCategoriaListQueryMock.mockReturnValue({ data: [], isPending: false })
  useProdutoListQueryMock.mockReturnValue({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
  render(
    <MemoryRouter>
      <ProdutoListPage />
    </MemoryRouter>
  )
}

describe('ProdutoListPage', () => {
  it('oculta botao novo produto sem permissao de gestao', () => {
    setupProdutoListPage()

    expect(screen.queryByRole('link', { name: /Novo produto/i })).not.toBeInTheDocument()
  })
})
