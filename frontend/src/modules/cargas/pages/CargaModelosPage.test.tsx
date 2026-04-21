import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CargaModelo } from '@/modules/cargas/types/carga'

const listarModelosCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo[]> => Promise.resolve([]))
)
const criarModeloCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo> =>
    Promise.resolve({
      id: 'm1',
      nome: 'X',
      tipo: 'MOTOR',
      payload: {},
      ativo: true,
    })
  )
)
const atualizarModeloCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo> =>
    Promise.resolve({
      id: 'm1',
      nome: 'X',
      tipo: 'MOTOR',
      payload: {},
      ativo: true,
    })
  )
)
const deletarModeloCarga = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@/modules/cargas/services/cargaService', () => ({
  listarModelosCarga,
  criarModeloCarga,
  atualizarModeloCarga,
  deletarModeloCarga,
}))

const showToastFn = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastFn }),
}))

import CargaModelosPage from '@/modules/cargas/pages/CargaModelosPage'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('CargaModelosPage', () => {
  it('lista modelos e avisa quando nome está vazio ao gravar', async () => {
    showToastFn.mockClear()
    listarModelosCarga.mockResolvedValueOnce([
      {
        id: 'mm',
        nome: 'Modelo A',
        tipo: 'MOTOR',
        payload: { quantidade: 1 },
        ativo: true,
      } satisfies CargaModelo,
    ])

    render(<CargaModelosPage />, { wrapper })

    expect(await screen.findByRole('heading', { name: /Modelos de carga/i })).toBeInTheDocument()
    expect(await screen.findByText('Modelo A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))
    expect(showToastFn).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringContaining('nome'),
      })
    )
    expect(criarModeloCarga).not.toHaveBeenCalled()
  })

  it('cria modelo quando nome preenchido', async () => {
    showToastFn.mockClear()
    criarModeloCarga.mockClear()
    listarModelosCarga.mockResolvedValue([])

    render(<CargaModelosPage />, { wrapper })

    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Novo modelo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))

    await waitFor(() => expect(criarModeloCarga).toHaveBeenCalled())
    expect(showToastFn).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    )
  })
})
