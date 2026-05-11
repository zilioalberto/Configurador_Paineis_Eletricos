import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjetoDetailQuery } from './useProjetoDetailQuery'
import { useProjetoListQuery } from './useProjetoListQuery'

const listarProjetos = vi.hoisted(() => vi.fn())
const obterProjeto = vi.hoisted(() => vi.fn())

vi.mock('../services/projetoService', () => ({
  listarProjetos: () => listarProjetos(),
  obterProjeto: (...args: unknown[]) => obterProjeto(...args),
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('hooks de query de projetos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista projetos', async () => {
    listarProjetos.mockResolvedValue([{ id: 'p1' }])

    const { result } = renderHook(() => useProjetoListQuery(), {
      wrapper: (props) => wrapper(createClient(), props),
    })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'p1' }]))
    expect(listarProjetos).toHaveBeenCalled()
  })

  it('busca detalhe somente com id', async () => {
    obterProjeto.mockResolvedValue({ id: 'p1' })

    const disabled = renderHook(() => useProjetoDetailQuery(undefined), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(obterProjeto).not.toHaveBeenCalled()

    const enabled = renderHook(() => useProjetoDetailQuery('p1'), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual({ id: 'p1' }))
    expect(obterProjeto).toHaveBeenCalledWith('p1')
  })
})
