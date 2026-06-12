import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RelatorioFaturamentoFiltros } from '../types/relatorioFaturamento'
import { useRelatorioFaturamentoQuery } from './useRelatorioFaturamentoQuery'

const obterRelatorioFaturamento = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      cnpj: '07284171000139',
      filtros: { data_inicio: '2025-01-01', data_fim: '2025-12-31', top_clientes: 10 },
      resumo: {
        valor_total: '0',
        quantidade_documentos: 0,
        ticket_medio: '0',
        clientes_distintos: 0,
        meses_no_periodo: 12,
      },
      por_mes: [],
      por_cliente: [],
      por_anexo: [],
      por_objetivo: [],
      documentos: [],
    })
  )
)

vi.mock('../services/fiscalSimplesService', () => ({
  obterRelatorioFaturamento,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useRelatorioFaturamentoQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama obterRelatorioFaturamento com filtros', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const filtros: RelatorioFaturamentoFiltros = {
      data_inicio: '2025-07-01',
      data_fim: '2026-06-30',
      top_clientes: 15,
    }
    const { result } = renderHook(() => useRelatorioFaturamentoQuery(filtros), {
      wrapper: (p) => wrapper(qc, p),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(obterRelatorioFaturamento).toHaveBeenCalledWith(filtros)
  })
})
