import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const postMock = vi.hoisted(() =>
  vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('alocar-codigo')) {
      return Promise.resolve({ data: { codigo: '04001-26' } })
    }
    return Promise.resolve({ data: { id: 'uuid-1' } })
  })
)
const getMock = vi.hoisted(() =>
  vi.fn().mockImplementation((url: string) => {
    if (String(url).includes('responsaveis')) {
      return Promise.resolve({
        data: [{ id: 10, label: 'Utilizador Teste', email: 'u@test.com', tipo_usuario: 'ORCAMENTISTA' }],
      })
    }
    return Promise.resolve({ data: [] })
  })
)

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(args[0] as string),
    post: (...args: unknown[]) => postMock(args[0] as string),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { tipo_usuario: 'ADMIN', permissoes: ['projeto.editar'] },
  }),
}))

const mutateAsync = vi.fn()
const showToast = vi.fn()

vi.mock('../hooks/useProjetoMutations', () => ({
  useCreateProjetoMutation: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('../components/projeto-form/ProjetoForm', () => ({
  default: ({ onSubmit }: { onSubmit: (data: unknown) => Promise<void> }) => (
    <button type="button" onClick={() => void onSubmit({ nome: 'Novo' })}>
      enviar-teste
    </button>
  ),
}))

import ProjetoCreatePage from '@/modules/projetos/pages/ProjetoCreatePage'

describe('ProjetoCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue({ id: 'uuid-1' })
    postMock.mockImplementation((url: string) => {
      if (String(url).includes('alocar-codigo')) {
        return Promise.resolve({ data: { codigo: '04001-26' } })
      }
      return Promise.resolve({ data: { id: 'uuid-1' } })
    })
    getMock.mockImplementation((url: string) => {
      if (String(url).includes('responsaveis')) {
        return Promise.resolve({
          data: [{ id: 10, label: 'Utilizador Teste', email: 'u@test.com', tipo_usuario: 'ORCAMENTISTA' }],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('cria projeto e mostra toast de sucesso', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProjetoCreatePage />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByRole('heading', { name: /Novo Projeto/i })).toBeInTheDocument()
    const btn = await screen.findByRole('button', { name: /enviar-teste/i })
    fireEvent.click(btn)
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    )
  })
})
