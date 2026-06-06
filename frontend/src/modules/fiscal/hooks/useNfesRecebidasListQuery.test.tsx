import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNfesRecebidasListQuery } from './useNfesRecebidasListQuery'

const listarNfesRecebidas = vi.hoisted(() =>
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

vi.mock('../services/fiscalNfeService', () => ({
  listarNfesRecebidas,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useNfesRecebidasListQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama listarNfesRecebidas com filtros e paginação', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const filtros = { chave_acesso: '123', cnpj_emitente: '', cnpj_destinatario: '', numero: '', serie: '', status_importacao: '', origem_importacao: '' }
    const { result } = renderHook(() => useNfesRecebidasListQuery(filtros, 2, 25), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarNfesRecebidas).toHaveBeenCalledWith(filtros, 2, 25)
  })
})
