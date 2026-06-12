import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNfeEmitidaDetailQuery } from './useNfeEmitidaDetailQuery'

const PUBLIC_ID = vi.hoisted(() => '11111111-1111-4111-8111-111111111111')
const obterNfeEmitida = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ id: 7, public_id: PUBLIC_ID, numero: '100' })),
)

vi.mock('../services/fiscalNfeService', () => ({
  obterNfeEmitida,
}))

function wrapper({ children }: Readonly<{ children: ReactNode }>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useNfeEmitidaDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca detalhe quando public_id é válido', async () => {
    renderHook(() => useNfeEmitidaDetailQuery(PUBLIC_ID, true), { wrapper })
    await waitFor(() => expect(obterNfeEmitida).toHaveBeenCalledWith(PUBLIC_ID))
  })

  it('não busca quando desabilitado', () => {
    renderHook(() => useNfeEmitidaDetailQuery('', false), { wrapper })
    expect(obterNfeEmitida).not.toHaveBeenCalled()
  })
})
