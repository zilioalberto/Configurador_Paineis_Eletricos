import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useServicoDetailQuery } from './useServicoDetailQuery'

const obterServico = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: 's-1', codigo: 'SRV' })))

vi.mock('../services/servicoService', () => ({
  obterServico,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useServicoDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca serviço quando id informado', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useServicoDetailQuery('s-1'), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(obterServico).toHaveBeenCalledWith('s-1')
  })

  it('não busca sem id', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useServicoDetailQuery(undefined), {
      wrapper: (p) => wrapper(qc, p),
    })

    expect(obterServico).not.toHaveBeenCalled()
  })
})
