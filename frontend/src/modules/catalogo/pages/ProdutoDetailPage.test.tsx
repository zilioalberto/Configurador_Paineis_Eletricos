import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'a@test.com',
      tipo_usuario: 'ADMIN',
      permissoes: ['material.editar_lista'],
    },
  }),
}))

const useProdutoDetailQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/catalogo/hooks/useProdutoDetailQuery', () => ({
  useProdutoDetailQuery: () => useProdutoDetailQueryMock(),
}))

import ProdutoDetailPage from '@/modules/catalogo/pages/ProdutoDetailPage'

const produto = {
  id: 'pr1',
  codigo: 'ABC',
  descricao: 'Produto teste',
  categoria: 'CONTATORA',
  unidade_medida: 'UN',
  ativo: true,
  valor_unitario: '10.00',
}

function renderProdutoDetailPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/catalogo/${id}`]}>
      <Routes>
        <Route path="/catalogo/:id" element={<ProdutoDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

function mockProdutoDetailQuery(
  overrides: Partial<{
    data: unknown
    isPending: boolean
    isError: boolean
    error: unknown
  }>
) {
  useProdutoDetailQueryMock.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  })
}

describe('ProdutoDetailPage', () => {
  it('mostra carregamento', () => {
    mockProdutoDetailQuery({ isPending: true })
    renderProdutoDetailPage('pr1')
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument()
  })

  it('mostra erro da API', () => {
    mockProdutoDetailQuery({ isError: true, error: new Error('falhou') })
    renderProdutoDetailPage('pr1')
    expect(screen.getByText(/falhou|Erro/i)).toBeInTheDocument()
  })

  it('mostra código e navega ao fechar', () => {
    navigate.mockClear()
    mockProdutoDetailQuery({ data: produto })
    renderProdutoDetailPage('pr1')
    expect(screen.getByText('ABC')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Fechar/i }))
    expect(navigate).toHaveBeenCalledWith('/catalogo')
  })

  it('mostra link editar quando permitido', () => {
    mockProdutoDetailQuery({ data: produto })
    renderProdutoDetailPage('pr1')
    expect(screen.getByRole('link', { name: /Editar/i })).toHaveAttribute(
      'href',
      '/catalogo/pr1/editar'
    )
  })
})
