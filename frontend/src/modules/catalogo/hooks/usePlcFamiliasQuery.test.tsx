import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { usePlcFamiliasQuery } from './usePlcFamiliasQuery'

const listarPlcFamilias = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ familias: ['Família A'] }))
)

vi.mock('../services/plcFamiliaService', () => ({
  listarPlcFamilias,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('usePlcFamiliasQuery', () => {
  it('usa listarPlcFamilias como queryFn', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePlcFamiliasQuery(), {
      wrapper: (p) => wrapper(qc, p),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarPlcFamilias).toHaveBeenCalled()
    expect(result.current.data).toEqual({ familias: ['Família A'] })
  })
})
