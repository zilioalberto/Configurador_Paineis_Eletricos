import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NfesEmitidasFiltros } from '../types/documentoFiscalRecebido'
import { useNfesEmitidasListQuery } from './useNfesEmitidasListQuery'

const listarNfesEmitidas = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrevious: false,
    })
  )
)

vi.mock('../services/fiscalNfeService', () => ({
  listarNfesEmitidas,
}))

function wrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useNfesEmitidasListQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama listarNfesEmitidas com filtros, paginação e ordenação', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const filtros: NfesEmitidasFiltros = {
      numero: '42',
      competencia: '2026-06',
      tipo_documento: '',
      objetivo_saida: '',
      cfop: '',
      anexo_simples: '',
      incluir_faturamento: '',
      cnpj_destinatario: '',
      cliente: '',
    }
    const { result } = renderHook(
      () => useNfesEmitidasListQuery(filtros, 2, 25, 'valor_total'),
      { wrapper: (p) => wrapper(qc, p) }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(listarNfesEmitidas).toHaveBeenCalledWith(filtros, 2, 25, 'valor_total')
  })
})
