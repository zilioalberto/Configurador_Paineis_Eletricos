import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useExcluirNfeEmitidaMutation } from './useExcluirNfeEmitidaMutation'

const excluirDocumentoEmitido = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfeService', () => ({
  excluirDocumentoEmitido,
}))

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useExcluirNfeEmitidaMutation', () => {
  it('exclui documento e invalida caches do módulo fiscal', async () => {
    const publicId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee'
    excluirDocumentoEmitido.mockResolvedValue(undefined)
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')
    const rm = vi.spyOn(qc, 'removeQueries')

    const { result } = renderHook(() => useExcluirNfeEmitidaMutation(), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync(publicId)

    await waitFor(() => expect(excluirDocumentoEmitido).toHaveBeenCalledWith(publicId))
    expect(inv).toHaveBeenCalledWith({ queryKey: fiscalQueryKeys.all })
    expect(rm).toHaveBeenCalledWith({ queryKey: fiscalQueryKeys.nfeEmitida(publicId) })
  })
})
