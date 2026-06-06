import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjetoFluxoGates } from './useProjetoFluxoGates'

const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper(client: QueryClient, children: ReactNode) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useProjetoFluxoGates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCargaListQueryMock.mockReturnValue({ data: [{ id: 'c1' }], isPending: false })
  })

  it('libera composição quando todos os condutores foram aprovados linha a linha', () => {
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        condutores_revisao_confirmada: false,
        circuitos_carga: [{ id: 'cc1', condutores_aprovado: true }],
        alimentacao_geral: { id: 'ag1', condutores_aprovado: true },
      },
      isPending: false,
    })

    const { result } = renderHook(() => useProjetoFluxoGates('p1'), {
      wrapper: (props) => wrapper(createClient(), props.children),
    })

    expect(result.current.condutoresRevisaoOk).toBe(true)
    expect(result.current.podeAcessarComposicao).toBe(true)
  })

  it('mantém composição bloqueada quando há linha de condutor pendente', () => {
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        condutores_revisao_confirmada: false,
        circuitos_carga: [{ id: 'cc1', condutores_aprovado: true }],
        alimentacao_geral: { id: 'ag1', condutores_aprovado: false },
      },
      isPending: false,
    })

    const { result } = renderHook(() => useProjetoFluxoGates('p1'), {
      wrapper: (props) => wrapper(createClient(), props.children),
    })

    expect(result.current.condutoresRevisaoOk).toBe(false)
    expect(result.current.podeAcessarComposicao).toBe(false)
  })
})
