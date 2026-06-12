import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjecaoDasSimplesQuery } from './useProjecaoDasSimplesQuery'

const obterProjecaoDasSimples = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      cnpj: '07284171000139',
      competencia: '2026-06',
      data_referencia_rbt12: '2026-06-30',
      rbt12_total: '100000.00',
      fator_r: null,
      anexo_servicos: 'III',
      receita_competencia: '10000.00',
      das_estimado_total: '600.00',
      parcelas: [],
      faturamento_mensal: [],
      avisos: [],
      perfil: {
        id: 1,
        cnpj: '07284171000139',
        folha_salarios_12m: '0',
        encargos_folha_12m: '0',
        anexo_servicos_override: '',
        criado_em: '2026-01-01',
        atualizado_em: '2026-01-01',
      },
    })
  )
)

vi.mock('../services/fiscalSimplesService', () => ({
  obterProjecaoDasSimples,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useProjecaoDasSimplesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca projeção quando competência informada', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useProjecaoDasSimplesQuery('2026-06'), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(obterProjecaoDasSimples).toHaveBeenCalledWith('2026-06')
  })

  it('não dispara query sem competência', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useProjecaoDasSimplesQuery(''), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(obterProjecaoDasSimples).not.toHaveBeenCalled()
  })
})
