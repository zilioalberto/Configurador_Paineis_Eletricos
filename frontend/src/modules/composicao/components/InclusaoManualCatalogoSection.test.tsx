import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const buscarProdutosAutocompleteMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const adicionarMutateAsyncMock = vi.hoisted(() => vi.fn())
const removerMutateAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/modules/catalogo/services/produtoService', () => ({
  buscarProdutosAutocomplete: (...args: unknown[]) =>
    buscarProdutosAutocompleteMock(...args),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/composicao/hooks/useInclusaoManualMutations', () => ({
  useAdicionarInclusaoManualMutation: () => ({
    mutateAsync: adicionarMutateAsyncMock,
    isPending: false,
  }),
  useRemoverInclusaoManualMutation: () => ({
    mutateAsync: removerMutateAsyncMock,
    isPending: false,
  }),
}))

import { InclusaoManualCatalogoSection } from '@/modules/composicao/components/InclusaoManualCatalogoSection'
import type { InclusaoManualItem } from '@/modules/composicao/types/composicao'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('InclusaoManualCatalogoSection', () => {
  let qc: QueryClient

  beforeEach(() => {
    qc = makeQueryClient()
    useCategoriaListQueryMock.mockReturnValue({
      data: [{ id: 'c1', nome: 'PLC', nome_display: 'PLC' }],
      isPending: false,
    })
    buscarProdutosAutocompleteMock.mockResolvedValue([
      {
        id: 'p1',
        codigo: 'X-1',
        descricao: 'Item teste',
        categoria_display: 'PLC',
      },
    ])
    adicionarMutateAsyncMock.mockResolvedValue(undefined)
    removerMutateAsyncMock.mockResolvedValue(undefined)
    showToastMock.mockClear()
    buscarProdutosAutocompleteMock.mockClear()
    adicionarMutateAsyncMock.mockClear()
    removerMutateAsyncMock.mockClear()
  })

  it('somente leitura: mostra aviso e não exibe formulário de inclusão', () => {
    render(
      <InclusaoManualCatalogoSection projetoId="pr1" podeEditar={false} inclusoes={[]} />,
      { wrapper: wrapper(qc) },
    )
    expect(
      screen.getByText(/Projeto finalizado: inclusões manuais não podem ser alteradas/i),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/Buscar produto/i)).not.toBeInTheDocument()
  })

  it('busca com debounce, escolhe produto e inclui na composição', async () => {
    render(
      <InclusaoManualCatalogoSection projetoId="pr1" podeEditar={true} inclusoes={[]} />,
      { wrapper: wrapper(qc) },
    )

    const input = screen.getByLabelText(/Buscar produto/i)
    fireEvent.change(input, { target: { value: 'ab' } })
    fireEvent.focus(input)

    await waitFor(() => {
      expect(buscarProdutosAutocompleteMock).toHaveBeenCalledWith('ab', null)
    })

    const opt = await screen.findByRole('button', { name: /X-1/i })
    fireEvent.click(opt)

    expect(screen.getByRole('button', { name: /Trocar produto/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Incluir na composição/i }))

    await waitFor(() => {
      expect(adicionarMutateAsyncMock).toHaveBeenCalledWith({
        produto_id: 'p1',
        quantidade: '1',
        observacoes: undefined,
      })
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    )
  })

  it('remove inclusão manual quando pode editar', async () => {
    const inclusoes: InclusaoManualItem[] = [
      {
        id: 'inc1',
        ordem: 1,
        categoria_produto: 'PLC',
        categoria_produto_display: 'PLC',
        quantidade: '2',
        produto: { id: 'p9', codigo: 'Z', descricao: 'Z' },
      },
    ]
    render(
      <InclusaoManualCatalogoSection projetoId="pr1" podeEditar={true} inclusoes={inclusoes} />,
      { wrapper: wrapper(qc) },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))

    await waitFor(() => {
      expect(removerMutateAsyncMock).toHaveBeenCalledWith('inc1')
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', message: 'Inclusão removida.' }),
    )
  })
})
