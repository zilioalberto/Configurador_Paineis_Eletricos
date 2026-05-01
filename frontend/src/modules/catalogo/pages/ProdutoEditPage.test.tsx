import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const useParams = vi.hoisted(() => vi.fn(() => ({ id: 'pr1' })))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams,
  }
})

const showToastMock = vi.hoisted(() => vi.fn())
vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

const useProdutoDetailQueryMock = vi.hoisted(() => vi.fn())
const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/catalogo/hooks/useProdutoDetailQuery', () => ({
  useProdutoDetailQuery: () => useProdutoDetailQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoMutations', () => ({
  useUpdateProdutoMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/catalogo/utils/produtoPayload', () => ({
  produtoFormToApiPayload: vi.fn(() => ({ codigo: 'X', descricao: 'Y' })),
}))

vi.mock('@/modules/catalogo/components/ProdutoForm', () => ({
  default: ({
    onSubmit,
    loading,
  }: {
    onSubmit: (data: { codigo: string }) => Promise<void>
    loading?: boolean
  }) => (
    <div>
      <span>Form mock {loading ? 'busy' : 'idle'}</span>
      <button type="button" onClick={() => void onSubmit({ codigo: 'X' } as never)}>
        Submeter mock
      </button>
    </div>
  ),
}))

import ProdutoEditPage from '@/modules/catalogo/pages/ProdutoEditPage'

function renderEdit(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function W({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/catalogo/:id/editar" element={<ProdutoEditPage />} />
      </Routes>
    </MemoryRouter>,
    { wrapper: W },
  )
}

const categorias = [
  {
    id: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
    nome: 'SEM_REGRA_SUGESTAO_AUTOMATICA' as const,
    nome_display: 'Sem regra',
  },
]

const produtoApi = {
  id: 'pr1',
  codigo: 'C1',
  descricao: 'D1',
  categoria: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
  categoria_nome: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
  unidade_medida: 'UN',
  ativo: true,
  valor_unitario: '1.00',
}

describe('ProdutoEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParams.mockReturnValue({ id: 'pr1' })
    useCategoriaListQueryMock.mockReturnValue({
      data: categorias,
      isPending: false,
    })
  })

  it('sem id mostra alerta', () => {
    useParams.mockReturnValue({})
    useProdutoDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Routes>
            <Route path="*" element={<ProdutoEditPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText(/Produto não informado/i)).toBeInTheDocument()
  })

  it('mostra carregamento', () => {
    useProdutoDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderEdit('/catalogo/pr1/editar')
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument()
  })

  it('erro de carga mostra tentar novamente', () => {
    const refetch = vi.fn()
    useProdutoDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('falhou'),
      refetch,
    })
    renderEdit('/catalogo/pr1/editar')
    expect(screen.getByText(/Não foi possível carregar/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalled()
  })

  it('sucesso renderiza formulário e submit navega', async () => {
    useProdutoDetailQueryMock.mockReturnValue({
      data: produtoApi,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    mutateAsyncMock.mockResolvedValue(undefined)
    renderEdit('/catalogo/pr1/editar')
    expect(await screen.findByText(/Form mock idle/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Submeter mock/i }))
    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/catalogo/pr1')
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    )
  })
})
