import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const obterKanbanTarefas = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ quadro: null }))
)

vi.mock('../services/tarefasService', () => ({
  obterKanbanTarefas,
}))

import { useKanbanTarefasQuery } from './useKanbanTarefasQuery'

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useKanbanTarefasQuery', () => {
  it('carrega Kanban de tarefas', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useKanbanTarefasQuery(), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(obterKanbanTarefas).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual({ quadro: null })
  })
})
