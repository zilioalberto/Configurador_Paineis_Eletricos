import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
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
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'a@test.com',
        tipo_usuario: 'ADMIN',
        permissoes: ['material.editar_lista'],
      },
    })
  })

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

  it('não mostra ações de edição sem permissão', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        tipo_usuario: 'USUARIO',
        permissoes: [],
      },
    })
    mockProdutoDetailQuery({ data: produto })
    renderProdutoDetailPage('pr1')
    expect(screen.queryByRole('link', { name: /Editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Novo produto/i })).not.toBeInTheDocument()
  })

  it('renderiza bloco de especificação quando payload contém dados', () => {
    mockProdutoDetailQuery({
      data: {
        ...produto,
        categoria_nome: 'CONTATORA',
        especificacao_contatora: {
          corrente_ac3_a: '9.0',
          corrente_ac1_a: '12.0',
          tensao_bobina_v: 24,
          tipo_corrente_bobina: 'CC',
          modo_montagem: 'TRILHO_DIN',
        },
      },
    })
    renderProdutoDetailPage('pr1')
    expect(screen.getByText(/Especificação/i)).toBeInTheDocument()
    expect(screen.getByText('9.0')).toBeInTheDocument()
  })
})
