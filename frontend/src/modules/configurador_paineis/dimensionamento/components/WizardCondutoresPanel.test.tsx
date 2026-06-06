import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AlimentacaoGeralCondutores,
  CircuitoCargaCondutores,
  ResumoDimensionamento,
} from '../types/dimensionamento'

const showToastMock = vi.hoisted(() => vi.fn())
const useDimensionamentoQueryMock = vi.hoisted(() => vi.fn())
const patchMutateAsyncMock = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({
  canEdit: true,
  patchPending: false,
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'teste@example.com',
      tipo_usuario: 'USUARIO',
      permissoes: [],
    },
  }),
}))

vi.mock('@/modules/auth/permissions', () => ({
  hasPermission: () => state.canEdit,
}))

vi.mock('../hooks/useDimensionamentoQuery', () => ({
  useDimensionamentoQuery: () => useDimensionamentoQueryMock(),
}))

vi.mock('../hooks/usePatchCondutoresDimensionamentoMutation', () => ({
  usePatchCondutoresDimensionamentoMutation: () => ({
    mutateAsync: patchMutateAsyncMock,
    isPending: state.patchPending,
  }),
}))

import WizardCondutoresPanel from './WizardCondutoresPanel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const tabelaReferencia = [
  { secao_mm2: '1.5', iz_a: '15' },
  { secao_mm2: '2.5', iz_a: '21' },
  { secao_mm2: '4', iz_a: '28' },
  { secao_mm2: '6', iz_a: '36' },
]

function circuito(overrides: Partial<CircuitoCargaCondutores> = {}): CircuitoCargaCondutores {
  return {
    id: 'circ-1',
    carga: 'carga-1',
    carga_tag: 'M01',
    tipo_carga: 'MOTOR',
    classificacao_circuito: 'POTENCIA',
    corrente_calculada_a: '18',
    corrente_projeto_a: '20',
    corrente_referencia_a: '20',
    possui_neutro: true,
    possui_pe: true,
    secao_condutor_fase_mm2: '2.5',
    secao_condutor_neutro_mm2: '2.5',
    secao_condutor_pe_mm2: '1.5',
    secao_condutor_fase_escolhida_mm2: null,
    secao_condutor_neutro_escolhida_mm2: null,
    secao_condutor_pe_escolhida_mm2: null,
    secao_condutor_fase_efetiva_mm2: '2.5',
    secao_condutor_neutro_efetiva_mm2: '2.5',
    secao_condutor_pe_efetiva_mm2: '1.5',
    condutores_aprovado: false,
    ...overrides,
  }
}

function alimentacao(
  overrides: Partial<AlimentacaoGeralCondutores> = {}
): AlimentacaoGeralCondutores {
  return {
    id: 'ag-1',
    corrente_total_painel_a: '25',
    tipo_corrente: 'CA',
    numero_fases: 3,
    possui_neutro: true,
    possui_terra: true,
    secao_condutor_fase_mm2: '2.5',
    secao_condutor_neutro_mm2: '2.5',
    secao_condutor_pe_mm2: '2.5',
    secao_condutor_fase_escolhida_mm2: '1.5',
    secao_condutor_neutro_escolhida_mm2: null,
    secao_condutor_pe_escolhida_mm2: null,
    secao_condutor_fase_efetiva_mm2: '2.5',
    secao_condutor_neutro_efetiva_mm2: '2.5',
    secao_condutor_pe_efetiva_mm2: '2.5',
    condutores_aprovado: false,
    ...overrides,
  }
}

function dimensionamento(overrides: Partial<ResumoDimensionamento> = {}): ResumoDimensionamento {
  return {
    id: 'dim-1',
    projeto: 'proj-1',
    projeto_codigo: 'PRJ-001',
    projeto_nome: 'Projeto teste',
    atualizado_em: '2026-05-03T10:00:00.000Z',
    corrente_total_painel_a: '25',
    condutores_revisao_confirmada: false,
    condutores_tabela_referencia: tabelaReferencia,
    circuitos_carga: [
      circuito(),
      circuito({
        id: 'circ-2',
        carga: 'carga-2',
        carga_tag: 'M02',
        corrente_referencia_a: '8',
        secao_condutor_fase_escolhida_mm2: '4',
        secao_condutor_neutro_escolhida_mm2: null,
        secao_condutor_pe_escolhida_mm2: '2.5',
        secao_condutor_fase_efetiva_mm2: '4',
        secao_condutor_neutro_efetiva_mm2: null,
        secao_condutor_pe_efetiva_mm2: '2.5',
        possui_neutro: false,
        condutores_aprovado: true,
      }),
    ],
    alimentacao_geral: alimentacao(),
    ...overrides,
  }
}

function mockDimensionamentoQuery(data: ResumoDimensionamento | null) {
  useDimensionamentoQueryMock.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
  })
}

function renderPanel(props: Partial<ComponentProps<typeof WizardCondutoresPanel>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={qc}>
      <WizardCondutoresPanel projetoId="proj-1" {...props} />
    </QueryClientProvider>
  )
  const originalRerender = result.rerender
  // override rerender so callers don't need to wrap again
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(result as any).rerender = (ui: any) => originalRerender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  return result
}

describe('WizardCondutoresPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.canEdit = true
    state.patchPending = false
    patchMutateAsyncMock.mockResolvedValue({})
    mockDimensionamentoQuery(dimensionamento())
  })

  it('renderiza estados de carregamento, erro, sem dados e sem circuitos', () => {
    useDimensionamentoQueryMock.mockReturnValueOnce({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    })
    const { rerender } = renderPanel()
    expect(screen.getByText(/Carregando dimensionamento de condutores/i)).toBeInTheDocument()

    useDimensionamentoQueryMock.mockReturnValueOnce({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Falha ao carregar'),
    })
    rerender(<WizardCondutoresPanel projetoId="proj-1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar')

    useDimensionamentoQueryMock.mockReturnValueOnce({
      data: null,
      isPending: false,
      isError: false,
      error: null,
    })
    rerender(<WizardCondutoresPanel projetoId="proj-1" />)
    expect(screen.getByText(/Sem dados de dimensionamento/i)).toBeInTheDocument()

    mockDimensionamentoQuery(
      dimensionamento({
        circuitos_carga: [],
        alimentacao_geral: null,
      })
    )
    rerender(<WizardCondutoresPanel projetoId="proj-1" />)
    expect(screen.getByText(/Nenhum circuito de carga dimensionado/i)).toBeInTheDocument()
  })

  it('aprova circuito pendente respeitando overrides de bitola', async () => {
    renderPanel()

    const row = screen.getByRole('row', { name: /M01/i })
    const selects = within(row).getAllByRole('combobox')
    expect(within(selects[0]).queryByRole('option', { name: '1.5 mm²' })).not.toBeInTheDocument()

    fireEvent.change(selects[0], { target: { value: '4' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Aprovar' }))

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        circuitos: [
          {
            id: 'circ-1',
            secao_condutor_fase_escolhida_mm2: '4',
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
            condutores_aprovado: true,
          },
        ],
        alimentacao_geral: {},
        confirmar_revisao: false,
      })
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Bitolas da carga M01 aprovadas.',
      })
    )
  })

  it('restaura sugestão de circuito e alimentação geral', async () => {
    renderPanel()

    const row = screen.getByRole('row', { name: /M01/i })
    fireEvent.click(within(row).getByRole('button', { name: 'Usar sugestão' }))

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        circuitos: [
          {
            id: 'circ-1',
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
          },
        ],
        alimentacao_geral: {},
        confirmar_revisao: false,
      })
    )

    const agRow = screen.getByRole('row', { name: /25/i })
    fireEvent.click(within(agRow).getByRole('button', { name: 'Usar sugestão' }))

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenLastCalledWith({
        circuitos: [],
        alimentacao_geral: {
          secao_condutor_fase_escolhida_mm2: null,
          secao_condutor_neutro_escolhida_mm2: null,
          secao_condutor_pe_escolhida_mm2: null,
        },
        confirmar_revisao: false,
      })
    )
  })

  it('aprova alimentação geral usando apenas opções coerentes com o mínimo', async () => {
    renderPanel()

    const agRow = screen.getByRole('row', { name: /25/i })
    const selects = within(agRow).getAllByRole('combobox')
    expect((selects[0] as HTMLSelectElement).value).toBe('__sugestao__')
    expect(within(selects[0]).queryByRole('option', { name: '1.5 mm²' })).not.toBeInTheDocument()

    fireEvent.change(selects[0], { target: { value: '6' } })
    fireEvent.click(within(agRow).getByRole('button', { name: 'Aprovar' }))

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        circuitos: [],
        alimentacao_geral: {
          secao_condutor_fase_escolhida_mm2: '6',
          secao_condutor_neutro_escolhida_mm2: null,
          secao_condutor_pe_escolhida_mm2: null,
          condutores_aprovado: true,
        },
        confirmar_revisao: false,
      })
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Alimentação geral aprovada.' })
    )
  })

  it('aprova todas e restaura todas as linhas', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar todas' }))

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        circuitos: [
          {
            id: 'circ-1',
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
          },
          {
            id: 'circ-2',
            secao_condutor_fase_escolhida_mm2: '4',
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: '2.5',
          },
        ],
        alimentacao_geral: {
          secao_condutor_fase_escolhida_mm2: null,
          secao_condutor_neutro_escolhida_mm2: null,
          secao_condutor_pe_escolhida_mm2: null,
        },
        confirmar_revisao: true,
      })
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: /Usar apenas sugestões do sistema/i,
      })
    )

    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenLastCalledWith({
        circuitos: [
          {
            id: 'circ-1',
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
            condutores_aprovado: false,
          },
          {
            id: 'circ-2',
            secao_condutor_fase_escolhida_mm2: null,
            secao_condutor_neutro_escolhida_mm2: null,
            secao_condutor_pe_escolhida_mm2: null,
            condutores_aprovado: false,
          },
        ],
        alimentacao_geral: {
          secao_condutor_fase_escolhida_mm2: null,
          secao_condutor_neutro_escolhida_mm2: null,
          secao_condutor_pe_escolhida_mm2: null,
          condutores_aprovado: false,
        },
        confirmar_revisao: false,
      })
    )
  })

  it('reabre circuito e alimentação já aprovados em modo incorporado', async () => {
    mockDimensionamentoQuery(
      dimensionamento({
        condutores_revisao_confirmada: true,
        circuitos_carga: [
          circuito({
            condutores_aprovado: true,
            secao_condutor_fase_efetiva_mm2: '4',
          }),
        ],
        alimentacao_geral: alimentacao({ condutores_aprovado: true }),
      })
    )
    renderPanel({ embedded: true })

    expect(screen.getByText(/Revisão confirmada/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Condutores \(revisão\)/i })).not.toBeInTheDocument()

    const circuitoRow = screen.getByRole('row', { name: /M01/i })
    fireEvent.click(within(circuitoRow).getByRole('button', { name: 'Revisar' }))
    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        circuitos: [{ id: 'circ-1', condutores_aprovado: false }],
        alimentacao_geral: {},
        confirmar_revisao: false,
      })
    )

    const agRow = screen.getByRole('row', { name: /25/i })
    fireEvent.click(within(agRow).getByRole('button', { name: 'Revisar' }))
    await waitFor(() =>
      expect(patchMutateAsyncMock).toHaveBeenLastCalledWith({
        circuitos: [],
        alimentacao_geral: { condutores_aprovado: false },
        confirmar_revisao: false,
      })
    )
  })

  it('bloqueia ações de edição para usuário sem permissão', () => {
    state.canEdit = false

    renderPanel()

    expect(screen.queryByRole('button', { name: 'Aprovar todas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('combobox')[0]).toBeDisabled()
  })

  it('exibe toast de erro quando aprovar todas falha', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    patchMutateAsyncMock.mockRejectedValueOnce(new Error('Falha de API'))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Aprovar todas' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Não foi possível aprovar todas',
        })
      )
    )

    consoleErrorSpy.mockRestore()
  })
})
