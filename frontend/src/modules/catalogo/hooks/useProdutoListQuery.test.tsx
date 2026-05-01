import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useProdutoListQuery } from './useProdutoListQuery'

const listarProdutos = vi.hoisted(() =>
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

vi.mock('../services/produtoService', () => ({
  listarProdutos,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useProdutoListQuery', () => {
  it('chama listarProdutos com categoria, página e tamanho', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useProdutoListQuery('cat-1', 3, 20), {
      wrapper: (p) => wrapper(qc, p),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarProdutos).toHaveBeenCalledWith('cat-1', 3, 20)
  })
})
