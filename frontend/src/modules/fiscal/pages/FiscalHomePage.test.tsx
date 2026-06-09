import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import type { ProdutoListItem } from '@/modules/catalogo/types/produto'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const buscarProdutosAutocomplete = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/catalogo/services/produtoService', () => ({
  buscarProdutosAutocomplete,
}))

import FiscalHomePage from './FiscalHomePage'

function produtoStub(overrides: Partial<ProdutoListItem> = {}): ProdutoListItem {
  return {
    id: 'p0',
    codigo: 'C0',
    descricao: 'D0',
    categoria: '',
    fabricante: '',
    unidade_medida: 'UN',
    preco_base: '0',
    ativo: true,
    ...overrides,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FiscalHomePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FiscalHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ user: authUser() })
    buscarProdutosAutocomplete.mockResolvedValue([])
  })

  it('renderiza titulo e texto inicial sem busca', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Fiscal' })).toBeInTheDocument()
    expect(screen.getByText(/Comece a escrever para ver sugestões/i)).toBeInTheDocument()
  })

  it('atalho para NF-es recebidas', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Ver documentos/i })).toHaveAttribute('href', '/fiscal/nfes')
    expect(screen.getByRole('link', { name: /Gerar relatório/i })).toHaveAttribute(
      'href',
      '/fiscal/relatorios/nfes'
    )
  })

  it('apos debounce lista resultados e link de edicao com permissao', async () => {
    useAuthMock.mockReturnValue({ user: authUser([PERMISSION_KEYS.MATERIAL_EDITAR_LISTA]) })
    buscarProdutosAutocomplete.mockResolvedValue([
      produtoStub({ id: 'p1', codigo: 'FAB-1', descricao: 'Item A', fabricante: 'ACME' }),
    ])
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fab' } })

    await waitFor(() => expect(buscarProdutosAutocomplete).toHaveBeenCalledWith('fab', null, 1))
    await waitFor(() => expect(screen.getByText('FAB-1')).toBeInTheDocument())

    expect(screen.getByRole('link', { name: /Ver dados fiscais/i })).toHaveAttribute(
      'href',
      '/catalogo/produtos/p1'
    )
    expect(screen.getByRole('link', { name: /Editar produto/i })).toHaveAttribute(
      'href',
      '/catalogo/produtos/p1/editar'
    )
    expect(screen.getByText('ACME')).toBeInTheDocument()
  })

  it('nao mostra linha de fabricante quando fabricante esta vazio', async () => {
    buscarProdutosAutocomplete.mockResolvedValue([produtoStub({ id: 'p1', codigo: 'X', descricao: 'Y' })])
    renderPage()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'x' } })
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    const itemBlock = screen.getByText('X').closest('.list-group-item')
    expect(itemBlock?.querySelector('.text-secondary')).toBeNull()
  })

  it('sem permissao de edicao oculta botao Editar produto', async () => {
    useAuthMock.mockReturnValue({ user: authUser([]) })
    buscarProdutosAutocomplete.mockResolvedValue([produtoStub({ id: 'x', codigo: 'C', descricao: 'D' })])
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'c' } })
    await waitFor(() => expect(screen.getByText('C')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /Editar produto/i })).not.toBeInTheDocument()
  })

  it('mostra mensagem de erro quando a busca falha', async () => {
    buscarProdutosAutocomplete.mockRejectedValue(new Error('falha rede'))
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'q' } })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('falha rede'))
  })

  it('mostra vazio quando nao ha resultados', async () => {
    buscarProdutosAutocomplete.mockResolvedValue([])
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    await waitFor(() =>
      expect(screen.getByText(/Nenhum produto encontrado com este texto/i)).toBeInTheDocument()
    )
  })
})
