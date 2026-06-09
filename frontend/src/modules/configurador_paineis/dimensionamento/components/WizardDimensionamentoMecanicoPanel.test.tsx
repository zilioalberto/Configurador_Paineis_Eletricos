import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { DimensionamentoMecanicoDetalhe } from '../types/dimensionamento'

const showToastMock = vi.hoisted(() => vi.fn())
const useDimensionamentoMecanicoQueryMock = vi.hoisted(() => vi.fn())
const calcMutateAsyncMock = vi.hoisted(() => vi.fn())
const salvarMutateAsyncMock = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({
  canEdit: true,
  calcPending: false,
  salvarPending: false,
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

vi.mock('../hooks/useDimensionamentoMecanicoQuery', () => ({
  useDimensionamentoMecanicoQuery: () => useDimensionamentoMecanicoQueryMock(),
}))

vi.mock('../hooks/useCalcularDimensionamentoMecanicoMutation', () => ({
  useCalcularDimensionamentoMecanicoMutation: () => ({
    mutateAsync: calcMutateAsyncMock,
    isPending: state.calcPending,
  }),
}))

vi.mock('../hooks/useSalvarDimensionamentoMecanicoEscolhasMutation', () => ({
  useSalvarDimensionamentoMecanicoEscolhasMutation: () => ({
    mutateAsync: salvarMutateAsyncMock,
    isPending: state.salvarPending,
  }),
}))

vi.mock('./PlacaCanaletasDiagram', () => ({
  default: () => <div data-testid="placa-canaletas-diagram">Diagrama</div>,
}))

import WizardDimensionamentoMecanicoPanel from './WizardDimensionamentoMecanicoPanel'

const canaletaPadrao = {
  produto_id: 'can-1',
  produto_codigo: 'C30',
  produto_descricao: 'Canaleta 30 mm',
  largura_base_mm: '30',
  altura_mm: '50',
}

function detalheMecanico(
  overrides: Partial<DimensionamentoMecanicoDetalhe> = {}
): DimensionamentoMecanicoDetalhe {
  return {
    taxa_ocupacao_max_configurada_percentual: '80',
    area_componentes_mm2: '5000',
    area_zona_util_min_mm2: '6250',
    largura_zona_util_mm: 240,
    altura_zona_util_mm: 390,
    largura_placa_min_mm: 300,
    altura_placa_min_mm: 450,
    profundidade_min_mm: 120,
    taxa_ocupacao_calculada_percentual: '5.35',
    canaleta_escolhida: canaletaPadrao,
    canaletas_catalogo: [canaletaPadrao],
    canaletas_verticais_sugeridas: 2,
    faixas_horizontais_sugeridas: 2,
    canaletas_verticais: 2,
    faixas_horizontais: 2,
    espacamento_max_horizontal_mm: 160,
    folga_profundidade_mm: 30,
    margem_placa_mm: 20,
    itens_considerados: [],
    itens_sem_dimensao: [],
    paineis_sugeridos: [
      {
        produto_id: 'painel-1',
        produto_codigo: 'P1',
        produto_descricao: 'Painel comercial 1',
        placa_largura_util_mm: '300',
        placa_altura_util_mm: '450',
        profundidade_mm: '150',
        tipo_painel: 'COMANDO',
        grau_protecao_ip: 'IP54',
      },
    ],
    memoria_calculo: 'Memória de teste',
    ...overrides,
  }
}

function mockMecanicoQuery(data: DimensionamentoMecanicoDetalhe | null) {
  useDimensionamentoMecanicoQueryMock.mockReturnValue({
    data,
    isPending: false,
    isError: false,
    error: null,
  })
}

function renderPanel(
  props: Partial<ComponentProps<typeof WizardDimensionamentoMecanicoPanel>> = {}
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={qc}>
      <WizardDimensionamentoMecanicoPanel projetoId="proj-1" {...props} />
    </QueryClientProvider>
  )
  const originalRerender = result.rerender
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(result as any).rerender = (ui: any) =>
    originalRerender(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
  return result
}

describe('WizardDimensionamentoMecanicoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.canEdit = true
    state.calcPending = false
    state.salvarPending = false
    calcMutateAsyncMock.mockResolvedValue({})
    salvarMutateAsyncMock.mockResolvedValue({})
    mockMecanicoQuery(detalheMecanico())
  })

  it('renderiza estados de carregamento, erro e sem dados', () => {
    useDimensionamentoMecanicoQueryMock.mockReturnValueOnce({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    })
    const { rerender } = renderPanel()
    expect(screen.getByText(/Carregando dimensionamento mecânico/i)).toBeInTheDocument()

    useDimensionamentoMecanicoQueryMock.mockReturnValueOnce({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Falha ao carregar'),
    })
    rerender(<WizardDimensionamentoMecanicoPanel projetoId="proj-1" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar')

    useDimensionamentoMecanicoQueryMock.mockReturnValueOnce({
      data: null,
      isPending: false,
      isError: false,
      error: null,
    })
    rerender(<WizardDimensionamentoMecanicoPanel projetoId="proj-1" />)
    expect(screen.getByText(/Sem dados de dimensionamento mecânico/i)).toBeInTheDocument()
  })

  it('renderiza painel principal com diagrama e tabela de painéis', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', { name: /Dimensionamento mecânico do painel/i })
    ).toBeInTheDocument()
    expect(screen.getByTestId('placa-canaletas-diagram')).toBeInTheDocument()
    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByLabelText(/Modelo de canaleta/i)).toHaveValue('can-1')
    expect(screen.getByLabelText(/Taxa máx. de ocupação/i)).toHaveValue(80)
  })

  it('modo incorporado oculta título e descrição', () => {
    renderPanel({ embedded: true })

    expect(
      screen.queryByRole('heading', { name: /Dimensionamento mecânico do painel/i })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recalcular composição' })).toBeInTheDocument()
  })

  it('recalcula composição e exibe toast de sucesso', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Recalcular composição' }))

    await waitFor(() => expect(calcMutateAsyncMock).toHaveBeenCalledTimes(1))
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Dimensionamento mecânico atualizado.',
      })
    )
  })

  it('salva escolhas de painel e canaletas', async () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar escolhas' }))

    await waitFor(() =>
      expect(salvarMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          painel_produto_id: 'painel-1',
          canaleta_produto_id: 'can-1',
          canaletas_verticais: 2,
          faixas_horizontais: 2,
          taxa_ocupacao_max_percentual: 80,
        })
      )
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Painel, canaletas e disposição salvos.',
      })
    )
  })

  it('exibe alerta quando painel já foi salvo', () => {
    mockMecanicoQuery(
      detalheMecanico({
        painel_escolhido: {
          produto_id: 'painel-1',
          produto_codigo: 'P1-SALVO',
          produto_descricao: 'Painel salvo',
          placa_largura_util_mm: '300',
          placa_altura_util_mm: '450',
          profundidade_mm: '150',
          tipo_painel: 'COMANDO',
          grau_protecao_ip: 'IP54',
        },
      })
    )
    renderPanel()

    expect(screen.getByText(/Painel salvo:/i)).toBeInTheDocument()
    expect(screen.getByText('P1-SALVO')).toBeInTheDocument()
  })

  it('exibe aviso quando não há canaletas no catálogo', () => {
    mockMecanicoQuery(
      detalheMecanico({
        canaleta_escolhida: null,
        canaleta: null,
        canaletas_catalogo: [],
      })
    )
    renderPanel()

    expect(screen.getByText(/Nenhuma canaleta ativa no catálogo/i)).toBeInTheDocument()
  })

  it('bloqueia ações de edição para usuário sem permissão', () => {
    state.canEdit = false
    renderPanel()

    expect(screen.queryByRole('button', { name: 'Recalcular composição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar escolhas' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Taxa máx. de ocupação/i)).toBeDisabled()
    expect(screen.getByLabelText(/Canaletas verticais/i)).toBeDisabled()
  })

  it('exibe toast de erro quando recalcular falha', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    calcMutateAsyncMock.mockRejectedValueOnce(new Error('Falha de API'))
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Recalcular composição' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Falha ao calcular',
        })
      )
    )

    consoleErrorSpy.mockRestore()
  })
})
