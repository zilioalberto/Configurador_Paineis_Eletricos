import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

import { useProjetoWizardFluxo } from './useProjetoWizardFluxo'

const useQueryMock = vi.hoisted(() => vi.fn())
const useProjetoDetailQueryMock = vi.hoisted(() => vi.fn())
const useCargaListQueryMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const useComposicaoSnapshotQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: () => useQueryMock(),
  }
})

vi.mock('@/modules/configurador_paineis/projetos/hooks/useProjetoDetailQuery', () => ({
  useProjetoDetailQuery: () => useProjetoDetailQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/cargas/hooks/useCargaListQuery', () => ({
  useCargaListQuery: () => useCargaListQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery', () => ({
  useComposicaoSnapshotQuery: () => useComposicaoSnapshotQueryMock(),
}))

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper(client: QueryClient, children: ReactNode) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useProjetoWizardFluxo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useQueryMock.mockReturnValue({ data: [], isPending: false })
  })

  it('considera etapa concluída quando tudo está aprovado (mesmo com condutores_revisao_confirmada=false)', () => {
    useProjetoDetailQueryMock.mockReturnValue({ data: { id: 'p1', codigo: 'PRJ-01', nome: 'P1' } })
    useCargaListQueryMock.mockReturnValue({ data: [{ id: 'c1' }], isPending: false })
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        corrente_total_painel_a: '33.1',
        condutores_revisao_confirmada: false,
        circuitos_carga: [{ id: 'cc1', condutores_aprovado: true }],
        alimentacao_geral: { id: 'ag1', condutores_aprovado: true },
      },
      isPending: false,
    })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 0 } },
      isPending: false,
    })

    const { result } = renderHook(() => useProjetoWizardFluxo('p1'), {
      wrapper: (props) => wrapper(createClient(), props.children),
    })

    expect(result.current.dimensionamentoEtapaConcluida).toBe(true)
  })

  it('mantém etapa não concluída quando alimentação geral não está aprovada', () => {
    useProjetoDetailQueryMock.mockReturnValue({ data: { id: 'p1', codigo: 'PRJ-01', nome: 'P1' } })
    useCargaListQueryMock.mockReturnValue({ data: [{ id: 'c1' }], isPending: false })
    useDimensionamentoQueryMock.mockReturnValue({
      data: {
        corrente_total_painel_a: '33.1',
        condutores_revisao_confirmada: false,
        circuitos_carga: [{ id: 'cc1', condutores_aprovado: true }],
        alimentacao_geral: { id: 'ag1', condutores_aprovado: false },
      },
      isPending: false,
    })
    useComposicaoSnapshotQueryMock.mockReturnValue({
      data: { totais: { sugestoes: 1, pendencias: 0, composicao_itens: 0 } },
      isPending: false,
    })

    const { result } = renderHook(() => useProjetoWizardFluxo('p1'), {
      wrapper: (props) => wrapper(createClient(), props.children),
    })

    expect(result.current.dimensionamentoEtapaConcluida).toBe(false)
  })
})

