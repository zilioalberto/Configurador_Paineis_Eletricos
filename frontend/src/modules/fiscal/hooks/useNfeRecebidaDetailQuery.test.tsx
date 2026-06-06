import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNfeRecebidaDetailQuery } from './useNfeRecebidaDetailQuery'

const obterNfeRecebida = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: 7, numero: '100' })))

vi.mock('../services/fiscalNfeService', () => ({
  obterNfeRecebida,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useNfeRecebidaDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca detalhe quando id é válido', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useNfeRecebidaDetailQuery(7, true), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(obterNfeRecebida).toHaveBeenCalledWith(7)
  })

  it('não dispara query quando id inválido', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useNfeRecebidaDetailQuery(0, false), {
      wrapper: (p) => wrapper(qc, p),
    })

    expect(obterNfeRecebida).not.toHaveBeenCalled()
  })
})
