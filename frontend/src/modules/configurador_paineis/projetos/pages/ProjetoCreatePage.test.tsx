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
    get: (url: string) => getMock(url),
    post: (url: string) => postMock(url),
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

import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarContext,
} from '@/components/layout/AppPageToolbarContext'
import ProjetoCreatePage from '@/modules/configurador_paineis/projetos/pages/ProjetoCreatePage'

function AppPageToolbarHost() {
  const { toolbar } = useAppPageToolbarContext()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function createTestClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderProjetoCreatePage() {
  const qc = createTestClient()
  return render(
    <QueryClientProvider client={qc}>
      <AppPageToolbarProvider>
        <MemoryRouter>
          <AppPageToolbarHost />
          <ProjetoCreatePage />
        </MemoryRouter>
      </AppPageToolbarProvider>
    </QueryClientProvider>
  )
}

function mockProjetoCreateApis() {
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
}

describe('ProjetoCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjetoCreateApis()
  })

  it('cria projeto e mostra toast de sucesso', async () => {
    renderProjetoCreatePage()
    const btn = await screen.findByRole('button', { name: /enviar-teste/i })
    fireEvent.click(btn)
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
    )
  })

  it('exibe cancelar na barra sem link voltar a configuracoes', async () => {
    renderProjetoCreatePage()
    await screen.findByRole('button', { name: /enviar-teste/i })
    expect(screen.queryByRole('link', { name: /Voltar à lista de configurações/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^← Configurações$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cancelar/i })).toHaveAttribute(
      'href',
      '/configurador/configuracoes'
    )
  })

  it('não exibe badges de código nem modo avulsa na barra', async () => {
    renderProjetoCreatePage()
    await screen.findByRole('button', { name: /enviar-teste/i })
    expect(screen.queryByText('04001-26')).not.toBeInTheDocument()
    expect(screen.queryByText(/Avulsa/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Vinculada à proposta/i)).not.toBeInTheDocument()
  })
})
