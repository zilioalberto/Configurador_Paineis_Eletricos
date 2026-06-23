import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const useProdutoListQueryMock = vi.hoisted(() => vi.fn())
const showToast = vi.hoisted(() => vi.fn())
const deleteMut = vi.hoisted(() => ({
  isPending: false,
  mutateAsync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoListQuery', () => ({
  useProdutoListQuery: (...args: unknown[]) => useProdutoListQueryMock(...args),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoMutations', () => ({
  useDeleteProdutoMutation: () => ({
    mutateAsync: (...args: unknown[]) => deleteMut.mutateAsync(...args),
    get isPending() {
      return deleteMut.isPending
    },
  }),
}))

vi.mock('@/components/feedback', async () => {
  const actual = await vi.importActual<typeof import('@/components/feedback')>('@/components/feedback')
  return {
    ...actual,
    useToast: () => ({ showToast: showToast }),
  }
})

import ProdutoListPage from '@/modules/catalogo/pages/ProdutoListPage'

const categorias = [
  { id: 'cat-a', nome: 'A', nome_display: 'Categoria A' },
  { id: 'cat-b', nome: 'B', nome_display: 'Categoria B' },
]

function pageVazio(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      items: [] as unknown[],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
      ...overrides,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }
}

function renderPage() {
  render(
    <MemoryRouter>
      <ProdutoListPage />
    </MemoryRouter>
  )
}

describe('ProdutoListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteMut.isPending = false
    deleteMut.mutateAsync.mockReset()
    deleteMut.mutateAsync.mockResolvedValue(undefined)
    useAuthMock.mockReturnValue({ user: authUser() })
    useCategoriaListQueryMock.mockReturnValue({ data: categorias, isPending: false })
    useProdutoListQueryMock.mockReturnValue(pageVazio())
  })

  it('oculta ações de gestão sem permissão material.editar_lista', () => {
    renderPage()

    expect(screen.queryByRole('link', { name: /Novo produto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Importar NF-e/i })).not.toBeInTheDocument()
  })

  it('mostra links de gestão com permissão e permite atualizar listagem', () => {
    const refetch = vi.fn()
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useProdutoListQueryMock.mockReturnValue({ ...pageVazio(), refetch })

    renderPage()

    expect(screen.getByRole('link', { name: /Novo produto/i })).toHaveAttribute('href', '/catalogo/produtos/novo')
    expect(screen.getByRole('link', { name: /Importar NF-e/i })).toHaveAttribute(
      'href',
      '/catalogo/produtos/importar-nfe'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('mostra carregamento de produtos sem listagem nem paginação', () => {
    useProdutoListQueryMock.mockReturnValue({
      ...pageVazio({ hasNext: true }),
      isPending: true,
    })

    renderPage()

    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument()
  })

  it('mostra erro de carregamento ou mensagem genérica', () => {
    useProdutoListQueryMock.mockReturnValue({
      ...pageVazio(),
      isError: true,
      error: new Error('Serviço indisponível'),
    })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Serviço indisponível')

    useProdutoListQueryMock.mockReturnValue({
      ...pageVazio(),
      isError: true,
      error: 'x' as never,
    })
    renderPage()
    expect(screen.getAllByRole('alert')[1]).toHaveTextContent('Não foi possível carregar os produtos.')
  })

  it('lista produtos, título do filtro e paginação', () => {
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useProdutoListQueryMock.mockReturnValue(
      pageVazio({
        items: [
          {
            id: 'p1',
            codigo: 'COD-1',
            descricao: 'Item um',
            categoria_display: 'PLC',
            fabricante_parceiro_nome: 'Fab',
            custo_referencia: '9,99',
            ativo: true,
          },
        ],
        total: 120,
        hasNext: true,
        hasPrevious: false,
      })
    )

    renderPage()

    expect(screen.getByRole('link', { name: 'COD-1' })).toHaveAttribute('href', '/catalogo/produtos/p1')
    expect(screen.getByText('Item um')).toBeInTheDocument()
    expect(screen.getByText(/Mostrando 1 de 120 itens/)).toBeInTheDocument()
    expect(screen.getByText('Todas as categorias')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
      target: { value: 'cat-a' },
    })
    expect(screen.getByText(/Listagem:/).closest('p')).toHaveTextContent('Categoria A')

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByRole('button', { name: /Página 2/i })).toBeInTheDocument()
  })

  it('filtra por busca rápida de código e reinicia paginação', () => {
    useProdutoListQueryMock.mockReturnValue(
      pageVazio({
        items: [
          {
            id: 'p1',
            codigo: '000000000015220827',
            descricao: 'Item encontrado',
            categoria_display: 'Minidisjuntor',
            fabricante_parceiro_nome: 'Fabricante',
            custo_referencia: '6.98',
            ativo: true,
          },
        ],
        total: 1,
        hasNext: true,
      })
    )

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByRole('button', { name: /Página 2/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Busca rápida por código'), {
      target: { value: '1522' },
    })

    expect(useProdutoListQueryMock).toHaveBeenLastCalledWith(null, 1, 50, '1522')
    expect(screen.getByRole('button', { name: /Página 1/i })).toBeInTheDocument()
  })

  it('lista vazia com link de cadastro para quem pode gerir', () => {
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    renderPage()

    expect(screen.getByText(/Nenhum produto encontrado/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cadastrar produto/i })).toHaveAttribute(
      'href',
      '/catalogo/produtos/novo'
    )
  })

  it('lista vazia sem link de cadastro sem permissão de gestão', () => {
    renderPage()
    expect(screen.getByText(/Nenhum produto encontrado/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Cadastrar produto/i })).not.toBeInTheDocument()
  })

  it('exclui produto com confirmação e toast de sucesso', async () => {
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useProdutoListQueryMock.mockReturnValue(
      pageVazio({
        items: [
          {
            id: 'del-1',
            codigo: 'X',
            descricao: 'Apagar isto',
            ativo: true,
            custo_referencia: '0',
          },
        ],
        total: 1,
      })
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const modal = screen.getByRole('dialog')
    expect(within(modal).getByRole('heading', { name: 'Excluir produto' })).toBeInTheDocument()
    expect(within(modal).getByText(/Apagar isto/)).toBeInTheDocument()

    fireEvent.click(within(modal).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => {
      expect(deleteMut.mutateAsync).toHaveBeenCalledWith('del-1')
    })
    expect(showToast).toHaveBeenCalledWith({
      variant: 'success',
      message: 'Produto excluído com sucesso.',
    })
  })

  it('mostra toast de erro ao falhar exclusão', async () => {
    deleteMut.mutateAsync.mockRejectedValueOnce(new Error('Em uso'))
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useProdutoListQueryMock.mockReturnValue(
      pageVazio({
        items: [{ id: 'e1', codigo: 'E1', descricao: '', ativo: true, custo_referencia: '1' }],
        total: 1,
      })
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Não foi possível excluir',
          message: 'Em uso',
        })
      )
    })
  })

  it('usa código como rótulo do modal quando descrição está vazia', () => {
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    useProdutoListQueryMock.mockReturnValue(
      pageVazio({
        items: [{ id: 'z', codigo: 'SÓ-CÓD', descricao: '  ', ativo: false, custo_referencia: '0' }],
        total: 1,
      })
    )

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(within(screen.getByRole('dialog')).getByText(/SÓ-CÓD/)).toBeInTheDocument()
  })
})
