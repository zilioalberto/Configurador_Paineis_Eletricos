import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { composicaoQueryKeys } from '@/modules/composicao/composicaoQueryKeys'

import { useReabrirComposicaoItemMutation } from './useReabrirComposicaoItemMutation'

const reabrirComposicaoItem = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      snapshot: {
        projeto: 'p99',
        sugestoes: [],
        pendencias: [],
        totais: { sugestoes: 0, pendencias: 0 },
      },
    })
  )
)

vi.mock('../services/composicaoService', () => ({
  reabrirComposicaoItem,
}))

function qcWrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useReabrirComposicaoItemMutation', () => {
  it('atualiza snapshot em cache e invalida composicao', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    qc.setQueryData(composicaoQueryKeys.snapshot('p99'), { projeto: 'old' })
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(
      () => useReabrirComposicaoItemMutation('p99'),
      {
        wrapper: (props) => qcWrapper(qc, props),
      }
    )

    await result.current.mutateAsync({ composicaoItemId: 'item-1' })

    await waitFor(() => expect(reabrirComposicaoItem).toHaveBeenCalledWith('item-1'))
    expect(qc.getQueryData(composicaoQueryKeys.snapshot('p99'))).toEqual(
      expect.objectContaining({ projeto: 'p99' })
    )
    expect(inv).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })

  it('sem projetoId não grava snapshot mas invalida', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useReabrirComposicaoItemMutation(null), {
      wrapper: (props) => qcWrapper(qc, props),
    })

    await result.current.mutateAsync({ composicaoItemId: 'x' })

    await waitFor(() => expect(inv).toHaveBeenCalled())
  })
})
