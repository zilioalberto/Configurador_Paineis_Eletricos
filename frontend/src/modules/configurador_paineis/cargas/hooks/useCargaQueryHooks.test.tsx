import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCargaDetailQuery } from './useCargaDetailQuery'
import { useCargaListQuery } from './useCargaListQuery'

const listarCargas = vi.hoisted(() => vi.fn())
const obterCarga = vi.hoisted(() => vi.fn())

vi.mock('../services/cargaService', () => ({
  listarCargas: (...args: unknown[]) => listarCargas(...args),
  obterCarga: (...args: unknown[]) => obterCarga(...args),
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('hooks de query de cargas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista cargas somente com projeto selecionado', async () => {
    listarCargas.mockResolvedValue([{ id: 'c1' }])

    const disabled = renderHook(() => useCargaListQuery(null), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(listarCargas).not.toHaveBeenCalled()

    const enabled = renderHook(() => useCargaListQuery('p1'), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual([{ id: 'c1' }]))
    expect(listarCargas).toHaveBeenCalledWith('p1')
  })

  it('busca detalhe somente com id', async () => {
    obterCarga.mockResolvedValue({ id: 'c1' })

    const disabled = renderHook(() => useCargaDetailQuery(undefined), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(obterCarga).not.toHaveBeenCalled()

    const enabled = renderHook(() => useCargaDetailQuery('c1'), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual({ id: 'c1' }))
    expect(obterCarga).toHaveBeenCalledWith('c1')
  })
})
