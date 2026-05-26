import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const showToastFn = vi.hoisted(() => vi.fn())
const mutateAsync = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ projeto: 'p-editavel' }))
)

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@test.com', tipo_usuario: 'ADMIN', permissoes: [] },
  }),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastFn }),
}))

const useProjetoListQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaMutations', () => ({
  useCreateCargaMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

import { NovaCargaModal } from '@/modules/configurador_paineis/cargas/components/NovaCargaModal'

const projetoEditavel = {
  id: 'p-editavel',
  nome: 'Proj',
  codigo: 'P-1',
  status: 'EM_ANDAMENTO',
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('NovaCargaModal', () => {
  it('não renderiza quando fechado', () => {
    useProjetoListQueryMock.mockReturnValue({ data: [projetoEditavel], isPending: false })
    useCargaListQueryMock.mockReturnValue({ data: [], isPending: false })
    render(
      <NovaCargaModal show={false} projetoId="p-editavel" onClose={vi.fn()} />,
      { wrapper }
    )
    expect(screen.queryByRole('dialog', { name: /Nova carga/i })).not.toBeInTheDocument()
  })

  it('exibe formulário compacto sem campo projeto e salvar no topo', async () => {
    useProjetoListQueryMock.mockReturnValue({ data: [projetoEditavel], isPending: false })
    useCargaListQueryMock.mockReturnValue({ data: [], isPending: false })
    render(
      <NovaCargaModal show projetoId="p-editavel" onClose={vi.fn()} />,
      { wrapper }
    )

    expect(screen.getByRole('heading', { name: /Nova carga/i })).toBeInTheDocument()
    expect(screen.queryByText(/Projeto e identificação/i)).not.toBeInTheDocument()
    expect(document.querySelector('select[name="projeto"]')).toBeNull()
    expect(screen.getByRole('button', { name: /^Salvar$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByText(/Arraste para mover/i)).not.toBeInTheDocument()
  })

  it('não submete ao pressionar Enter em um campo', async () => {
    mutateAsync.mockClear()
    const onClose = vi.fn()
    useProjetoListQueryMock.mockReturnValue({ data: [projetoEditavel], isPending: false })
    useCargaListQueryMock.mockReturnValue({ data: [], isPending: false })
    render(
      <NovaCargaModal show projetoId="p-editavel" onClose={onClose} />,
      { wrapper }
    )

    const potencia = document.querySelector('input[name="motor.potencia"]')
    if (!potencia) {
      const descricao = document.querySelector('input[name="descricao"]')!
      fireEvent.keyDown(descricao, { key: 'Enter', code: 'Enter' })
    } else {
      fireEvent.keyDown(potencia, { key: 'Enter', code: 'Enter' })
    }

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('submete criação e fecha modal', async () => {
    mutateAsync.mockClear()
    const onClose = vi.fn()
    useProjetoListQueryMock.mockReturnValue({ data: [projetoEditavel], isPending: false })
    useCargaListQueryMock.mockReturnValue({ data: [], isPending: false })
    render(
      <NovaCargaModal show projetoId="p-editavel" onClose={onClose} />,
      { wrapper }
    )

    fireEvent.change(document.querySelector('input[name="descricao"]')!, {
      target: { value: 'Motor principal' },
    })
    fireEvent.change(screen.getByPlaceholderText(/M01/i), {
      target: { value: 'M01' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
