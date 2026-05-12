import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dashboardQueryKeys } from '../dashboardQueryKeys'
import { useDashboardResumoQuery } from './useDashboardResumoQuery'

const obterDashboardResumo = vi.hoisted(() => vi.fn())

vi.mock('../services/dashboardService', () => ({
  obterDashboardResumo: () => obterDashboardResumo(),
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useDashboardResumoQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carrega resumo do dashboard e usa a key esperada', async () => {
    obterDashboardResumo.mockResolvedValue({ totais: { projetos: 2 } })
    const client = createClient()

    const { result } = renderHook(() => useDashboardResumoQuery(), {
      wrapper: (props) => wrapper(client, props),
    })

    await waitFor(() => expect(result.current.data).toEqual({ totais: { projetos: 2 } }))
    expect(obterDashboardResumo).toHaveBeenCalled()
    expect(client.getQueryData(dashboardQueryKeys.resumo())).toEqual({
      totais: { projetos: 2 },
    })
  })
})
