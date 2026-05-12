import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFiscalProdutoBuscaQuery } from './useFiscalProdutoBuscaQuery'

const buscarProdutosAutocomplete = vi.hoisted(() => vi.fn())

vi.mock('@/modules/catalogo/services/produtoService', () => ({
  buscarProdutosAutocomplete,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useFiscalProdutoBuscaQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buscarProdutosAutocomplete.mockResolvedValue([])
  })

  it('nao chama a API quando a consulta esta vazia', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useFiscalProdutoBuscaQuery('   '), {
      wrapper: (p) => wrapper(qc, p),
    })
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(buscarProdutosAutocomplete).not.toHaveBeenCalled()
  })

  it('chama buscarProdutosAutocomplete com termo trimado e minChars 1', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useFiscalProdutoBuscaQuery('  z  '), {
      wrapper: (p) => wrapper(qc, p),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(buscarProdutosAutocomplete).toHaveBeenCalledWith('z', null, 1)
  })
})
