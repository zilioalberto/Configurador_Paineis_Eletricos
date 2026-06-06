import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useCreateServicoMutation,
  useDeleteServicoMutation,
  useUpdateServicoMutation,
} from './useServicoMutations'

const criarServico = vi.hoisted(() => vi.fn())
const atualizarServico = vi.hoisted(() => vi.fn())
const excluirServico = vi.hoisted(() => vi.fn())

vi.mock('../services/servicoService', () => ({
  criarServico,
  atualizarServico,
  excluirServico,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useServicoMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    criarServico.mockResolvedValue({ id: 's-1', codigo: 'SRV' })
    atualizarServico.mockResolvedValue({ id: 's-1', codigo: 'SRV-2' })
    excluirServico.mockResolvedValue(undefined)
  })

  it('useCreateServicoMutation invalida cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreateServicoMutation(), {
      wrapper: (p) => wrapper(qc, p),
    })

    await result.current.mutateAsync({ codigo: 'SRV' })
    expect(criarServico).toHaveBeenCalledWith({ codigo: 'SRV' })
    expect(invalidate).toHaveBeenCalled()
  })

  it('useUpdateServicoMutation atualiza detalhe no cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useUpdateServicoMutation(), {
      wrapper: (p) => wrapper(qc, p),
    })

    await result.current.mutateAsync({ id: 's-1', body: { descricao: 'Novo' } })
    expect(atualizarServico).toHaveBeenCalledWith('s-1', { descricao: 'Novo' })
  })

  it('useDeleteServicoMutation remove detalhe do cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const remove = vi.spyOn(qc, 'removeQueries')
    const { result } = renderHook(() => useDeleteServicoMutation(), {
      wrapper: (p) => wrapper(qc, p),
    })

    await result.current.mutateAsync('s-9')
    expect(excluirServico).toHaveBeenCalledWith('s-9')
    expect(remove).toHaveBeenCalled()
  })
})
