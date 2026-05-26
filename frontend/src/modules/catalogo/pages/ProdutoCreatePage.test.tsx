import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

const showToastMock = vi.hoisted(() => vi.fn())
vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

const useCategoriaListQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/catalogo/hooks/useCategoriaListQuery', () => ({
  useCategoriaListQuery: () => useCategoriaListQueryMock(),
}))

vi.mock('@/modules/catalogo/hooks/useProdutoMutations', () => ({
  useCreateProdutoMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

vi.mock('@/modules/catalogo/utils/produtoPayload', () => ({
  produtoFormToApiPayload: vi.fn(() => ({ codigo: 'P1', descricao: 'Produto 1' })),
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
      <button type="button" onClick={() => void onSubmit({ codigo: 'P1' } as never)}>
        Criar mock
      </button>
    </div>
  ),
}))

import ProdutoCreatePage from './ProdutoCreatePage'

const categorias = [
  {
    id: 'SEM_REGRA_SUGESTAO_AUTOMATICA',
    nome: 'SEM_REGRA_SUGESTAO_AUTOMATICA' as const,
    nome_display: 'Sem regra',
  },
]

function renderCreatePage() {
  return render(
    <MemoryRouter>
      <ProdutoCreatePage />
    </MemoryRouter>
  )
}

describe('ProdutoCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCategoriaListQueryMock.mockReturnValue({
      data: categorias,
      isPending: false,
    })
  })

  it('mostra carregamento de categorias', () => {
    useCategoriaListQueryMock.mockReturnValue({
      data: [],
      isPending: true,
    })

    renderCreatePage()

    expect(screen.getByText(/Carregando categorias/i)).toBeInTheDocument()
  })

  it('mostra alerta quando não há categorias', () => {
    useCategoriaListQueryMock.mockReturnValue({
      data: [],
      isPending: false,
    })

    renderCreatePage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Não foi possível carregar a lista de categorias/i
    )
  })

  it('cria produto e navega para detalhe', async () => {
    mutateAsyncMock.mockResolvedValue({ id: 'prod-1' })

    renderCreatePage()

    expect(screen.getByText(/Form mock idle/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Criar mock/i }))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled())
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      codigo: 'P1',
      descricao: 'Produto 1',
    })
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    )
    expect(navigate).toHaveBeenCalledWith('/catalogo/produtos/prod-1')
  })

  it('mostra toast de erro ao falhar criação', async () => {
    const error = new AxiosError('conflict')
    error.response = { status: 400, data: { detail: 'Código duplicado' } } as AxiosError['response']
    mutateAsyncMock.mockRejectedValue(error)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    renderCreatePage()
    fireEvent.click(screen.getByRole('button', { name: /Criar mock/i }))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Não foi possível salvar',
          message: 'Código duplicado',
        })
      )
    })
    expect(navigate).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
