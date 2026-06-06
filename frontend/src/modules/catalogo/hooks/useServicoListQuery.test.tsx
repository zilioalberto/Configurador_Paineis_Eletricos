import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useServicoListQuery } from './useServicoListQuery'

const listarServicos = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
    })
  )
)

vi.mock('../services/servicoService', () => ({
  listarServicos,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useServicoListQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama listarServicos com paginação', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useServicoListQuery(3, 20), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarServicos).toHaveBeenCalledWith(3, 20)
  })
})
