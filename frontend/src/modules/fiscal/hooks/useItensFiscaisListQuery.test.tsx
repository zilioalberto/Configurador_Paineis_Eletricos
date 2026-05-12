import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useItensFiscaisListQuery } from './useItensFiscaisListQuery'

const listarItensFiscais = vi.hoisted(() =>
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

vi.mock('../services/fiscalService', () => ({
  listarItensFiscais,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useItensFiscaisListQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama listarItensFiscais com pesquisa, pagina e tamanho', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useItensFiscaisListQuery('motor', 3, 20), {
      wrapper: (p) => wrapper(qc, p),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarItensFiscais).toHaveBeenCalledWith('motor', 3, 20)
  })
})
