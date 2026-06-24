import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useKanbanTarefasQueryMock = vi.hoisted(() => vi.fn())
const moverMutateAsyncMock = vi.hoisted(() => vi.fn())
const criarMutateAsyncMock = vi.hoisted(() => vi.fn())
const atualizarMutateAsyncMock = vi.hoisted(() => vi.fn())
const classificarMutateAsyncMock = vi.hoisted(() => vi.fn())
const iniciarTimerMutateAsyncMock = vi.hoisted(() => vi.fn())
const pararTimerMutateAsyncMock = vi.hoisted(() => vi.fn())
const criarQuadroPadraoMutateAsyncMock = vi.hoisted(() => vi.fn())
const useTarefaTimerAtivoQueryMock = vi.hoisted(() => vi.fn())
const useTarefaApontamentosQueryMock = vi.hoisted(() => vi.fn())
const useTarefaDashboardHorasDiaQueryMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())
const authUserMock = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useKanbanTarefasQuery', () => ({
  useKanbanTarefasQuery: () => useKanbanTarefasQueryMock(),
}))

vi.mock('../hooks/useTarefaMutations', () => ({
  useCriarQuadroPadraoTarefasMutation: () => ({
    mutateAsync: criarQuadroPadraoMutateAsyncMock,
    isPending: false,
  }),
  useCriarTarefaMutation: () => ({
    mutateAsync: criarMutateAsyncMock,
    isPending: false,
  }),
  useAtualizarTarefaMutation: () => ({
    mutateAsync: atualizarMutateAsyncMock,
    isPending: false,
  }),
  useClassificarTarefaMutation: () => ({
    mutateAsync: classificarMutateAsyncMock,
    isPending: false,
  }),
  useMoverTarefaMutation: () => ({
    mutateAsync: moverMutateAsyncMock,
    isPending: false,
  }),
  useIniciarTimerTarefaMutation: () => ({
    mutateAsync: iniciarTimerMutateAsyncMock,
    isPending: false,
  }),
  usePararTimerTarefaMutation: () => ({
    mutateAsync: pararTimerMutateAsyncMock,
    isPending: false,
  }),
  useCriarComentarioTarefaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAtualizarComentarioTarefaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEliminarComentarioTarefaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExcluirTarefaMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAprovarApontamentoHoraMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRejeitarApontamentoHoraMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAjustarApontamentoHoraMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../hooks/useTarefaTimerAtivoQuery', () => ({
  useTarefaTimerAtivoQuery: () => useTarefaTimerAtivoQueryMock(),
}))

vi.mock('../hooks/useTarefaApontamentosQuery', () => ({
  useTarefaApontamentosQuery: () => useTarefaApontamentosQueryMock(),
}))

vi.mock('../hooks/useTarefaHistoricoQuery', () => ({
  useTarefaHistoricoQuery: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../hooks/useTarefaComentariosQuery', () => ({
  useTarefaComentariosQuery: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../hooks/useTarefaDashboardHorasDiaQuery', () => ({
  useTarefaDashboardHorasDiaQuery: () => useTarefaDashboardHorasDiaQueryMock(),
}))

vi.mock('../hooks/useTarefaResponsaveisQuery', () => ({
  useTarefaResponsaveisQuery: () => ({
    data: [
      { id: 1, label: 'Ana Souza', email: 'ana@zfw.com', tipo_usuario: 'ENGENHARIA' },
      { id: 2, label: 'Bruno Lima', email: 'bruno@zfw.com', tipo_usuario: 'USUARIO' },
    ],
    isPending: false,
  }),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({ user: authUserMock(), status: 'ready' }),
}))

import TarefasKanbanPage from './TarefasKanbanPage'

function renderKanban() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TarefasKanbanPage />
    </QueryClientProvider>
  )
}

function usuarioComPermissoes(
  permissoes = [
    'tarefa.visualizar',
    'tarefa.criar',
    'tarefa.editar',
    'tarefa.apontar_horas',
    'tarefa.gerenciar_quadro',
    'tarefa.classificar',
    'tarefa.concluir',
  ]
) {
  return {
    email: 'ana@zfw.com',
    first_name: 'Ana',
    last_name: 'Souza',
    tipo_usuario: 'ENGENHARIA',
    permissoes,
  }
}

function kanbanData() {
  return {
    quadro: {
      id: 'q-1',
      nome: 'Execução',
      descricao: '',
      equipe: 'Produção',
      ativo: true,
      total_tarefas: 1,
      colunas: [
        {
          id: 'c-1',
          quadro: 'q-1',
          nome: 'Pendentes',
          ordem: 0,
          status_semantico: 'PENDENTE',
          status_semantico_display: 'Pendente',
          limite_wip: null,
          tarefas: [
            {
              id: 't-1',
              titulo: 'Montar base do painel',
              descricao: 'Separar materiais.',
              coluna: 'c-1',
              responsavel: 1,
              responsavel_nome: 'Ana Souza',
              colaboradores: [2],
              colaboradores_nomes: ['Bruno Lima'],
              prioridade: 'ALTA',
              prioridade_display: 'Alta',
              prazo: null,
              status: 'ABERTA',
              status_display: 'Aberta',
              pode_excluir: false,
              proposta_referencia: '',
              ordem_producao_referencia: '',
              horas_estipuladas: null,
              ordem: 0,
              concluida_em: null,
              total_horas_apontadas: '3.25',
            },
          ],
        },
        {
          id: 'c-2',
          quadro: 'q-1',
          nome: 'Trabalhando',
          ordem: 1,
          status_semantico: 'EM_ANDAMENTO',
          status_semantico_display: 'Em andamento',
          limite_wip: null,
          tarefas: [],
        },
        {
          id: 'c-3',
          quadro: 'q-1',
          nome: 'Entregue',
          ordem: 2,
          status_semantico: 'CONCLUIDO',
          status_semantico_display: 'Concluido',
          limite_wip: null,
          tarefas: [],
        },
      ],
    },
  }
}

function dataTransferMock() {
  const data = new Map<string, string>()
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn((type: string, value: string) => data.set(type, value)),
    getData: vi.fn((type: string) => data.get(type) ?? ''),
  }
}

function kanbanDataComTarefaEntregue() {
  const data = kanbanData()
  const tarefa = data.quadro.colunas[0].tarefas[0]
  tarefa.status = 'CONCLUIDA'
  tarefa.status_display = 'Concluída'
  ;(tarefa as { concluida_em: string | null }).concluida_em = '2026-05-07T12:00:00Z'
  return data
}

describe('TarefasKanbanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authUserMock.mockReturnValue(usuarioComPermissoes())
    moverMutateAsyncMock.mockResolvedValue({ id: 't-1', coluna: 'c-2', ordem: 0 })
    criarMutateAsyncMock.mockResolvedValue({ id: 't-2', titulo: 'Nova tarefa' })
    atualizarMutateAsyncMock.mockResolvedValue({ id: 't-1', titulo: 'Montar base revisada' })
    classificarMutateAsyncMock.mockResolvedValue({ id: 't-1' })
    iniciarTimerMutateAsyncMock.mockResolvedValue({ sessao: { tarefa: 't-1' } })
    pararTimerMutateAsyncMock.mockResolvedValue({
      sessao: { tarefa: 't-1', finalizado_em: '2026-05-06T12:00:00Z' },
      apontamento: { id: 'a-1', tarefa: 't-1', horas: '0.01' },
    })
    criarQuadroPadraoMutateAsyncMock.mockResolvedValue(kanbanData())
    useTarefaTimerAtivoQueryMock.mockReturnValue({ data: { sessao: null } })
    useTarefaApontamentosQueryMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    })
    useTarefaDashboardHorasDiaQueryMock.mockReturnValue({
      data: {
        data: '2026-05-06',
        colaborador: 1,
        colaborador_nome: 'Ana Souza',
        total_horas: '2.00',
        total_apontamentos: 2,
        total_tarefas: 1,
        apontamentos: [
          {
            id: 'a-1',
            tarefa: 't-1',
            colaborador: 1,
            colaborador_nome: 'Ana Souza',
            data: '2026-05-06',
            horas: '0.75',
            etapa: 'Teste',
            observacoes: '',
            criado_em: '2026-05-06T12:30:00Z',
            atualizado_em: '2026-05-06T12:30:00Z',
            status_aprovacao: 'PENDENTE',
            aprovado_por: null,
            aprovado_por_nome: null,
            aprovado_em: null,
            sessao_id: null,
            sessao_iniciado_em: null,
            sessao_finalizado_em: null,
          },
        ],
      },
      isPending: false,
      isError: false,
    })
    globalThis.localStorage.clear()
  })

  it('mostra estado vazio quando nao ha quadro ativo', () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: { quadro: null },
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    expect(screen.getByRole('heading', { name: 'Tarefas e Kanban' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nenhum quadro ativo encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar quadro padrão' })).toBeInTheDocument()
  })

  it('cria quadro padrao pelo estado vazio', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: { quadro: null },
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('button', { name: 'Criar quadro padrão' }))

    await waitFor(() => expect(criarQuadroPadraoMutateAsyncMock).toHaveBeenCalled())
  })

  it('renderiza colunas e tarefas do Kanban', () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    expect(screen.getAllByText('Execução').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Montar base do painel' })).toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByLabelText('Total de horas gastas: 3,25h')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar horas de Montar base do painel' })).toBeInTheDocument()
  })

  it('mostra dashboard diario de horas do colaborador', () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    const dashboard = screen.getByLabelText(
      'Total das minhas horas apontadas hoje em tarefas'
    )
    expect(within(dashboard).getByText('Minhas horas hoje')).toBeInTheDocument()
    expect(within(dashboard).getByText('2,00h')).toBeInTheDocument()
    expect(
      within(dashboard).getByText(/Soma das suas horas apontadas neste dia/)
    ).toBeInTheDocument()
  })

  it('alterna entre lista, calendario e dashboard', () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('tab', { name: 'Lista' }))
    expect(screen.getByRole('columnheader', { name: 'Tarefa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Montar base do painel/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Calendário' }))
    expect(
      screen.getByText('Nenhuma tarefa com prazo para exibir no calendário.')
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Dashboard' }))
    expect(screen.getByLabelText('Dashboard de tarefas')).toBeInTheDocument()
    expect(screen.getByText('Horas gastas')).toBeInTheDocument()
  })

  it('nao permite iniciar contagem em tarefa entregue', () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanDataComTarefaEntregue(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    expect(
      screen.queryByRole('button', { name: 'Iniciar horas de Montar base do painel' })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))

    expect(screen.queryByRole('button', { name: 'Iniciar horas' })).not.toBeInTheDocument()
    expect(screen.getByText('Tarefa entregue.')).toBeInTheDocument()
  })

  it('move tarefa por drag-and-drop para outra coluna', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })
    const dataTransfer = dataTransferMock()

    renderKanban()

    fireEvent.dragStart(screen.getByTestId('kanban-card-t-1'), { dataTransfer })
    fireEvent.dragOver(screen.getByTestId('kanban-column-c-2'), { dataTransfer })
    fireEvent.drop(screen.getByTestId('kanban-column-c-2'), { dataTransfer })

    await waitFor(() =>
      expect(moverMutateAsyncMock).toHaveBeenCalledWith({
        tarefaId: 't-1',
        colunaId: 'c-2',
        ordem: 0,
      })
    )
  })

  it('cria tarefa escolhendo responsavel do accounts', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }))
    fireEvent.change(screen.getByRole('textbox', { name: /título/i }), {
      target: { value: 'Testar fechamento do painel' },
    })
    fireEvent.change(screen.getByLabelText('Responsável'), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }))

    await waitFor(() =>
      expect(criarMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Testar fechamento do painel',
          coluna: 'c-1',
          responsavel: 1,
        })
      )
    )
  })

  it('abre tarefa ao clicar no card e salva alteracoes', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))
    fireEvent.change(screen.getByLabelText('Título'), {
      target: { value: 'Montar base revisada' },
    })
    fireEvent.change(screen.getByLabelText('Descrição'), {
      target: { value: 'Atualizado pelo teste.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() =>
      expect(atualizarMutateAsyncMock).toHaveBeenCalledWith({
        tarefaId: 't-1',
        payload: expect.objectContaining({
          titulo: 'Montar base revisada',
          coluna: 'c-1',
          responsavel: 1,
          descricao: 'Atualizado pelo teste.',
        }),
      })
    )
  })

  it('mantem colaboradores selecionados ao clicar em outro nome', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))
    fireEvent.click(screen.getByRole('checkbox', { name: /Ana Souza/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() =>
      expect(atualizarMutateAsyncMock).toHaveBeenCalledWith({
        tarefaId: 't-1',
        payload: expect.objectContaining({
          colaboradores: [2, 1],
        }),
      })
    )
  })

  it('mostra log de horas apontadas no modal da tarefa', () => {
    useTarefaApontamentosQueryMock.mockReturnValue({
      data: [
        {
          id: 'a-1',
          tarefa: 't-1',
          colaborador: 1,
          colaborador_nome: 'Ana Souza',
          data: '2026-05-06',
          horas: '1.25',
          etapa: 'Montagem',
          observacoes: 'Separou os materiais.',
          criado_em: '2026-05-06T12:30:00Z',
          atualizado_em: '2026-05-06T12:30:00Z',
          status_aprovacao: 'PENDENTE',
          aprovado_por: null,
          aprovado_por_nome: null,
          aprovado_em: null,
          sessao_id: 's-1',
          sessao_iniciado_em: '2026-05-06T11:00:00Z',
          sessao_finalizado_em: '2026-05-06T12:15:00Z',
        },
      ],
      isPending: false,
      isError: false,
    })
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))

    const totalizador = screen.getByLabelText('Totalizador de horas gastas')
    expect(within(totalizador).getByText('1,25h')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Log de horas/ }))
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1,25h').length).toBeGreaterThan(0)
    expect(screen.getByText('Cronômetro')).toBeInTheDocument()
    expect(screen.getByText('Separou os materiais.')).toBeInTheDocument()
  })

  it('inicia contagem de horas pela tarefa', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar horas' }))

    await waitFor(() => expect(iniciarTimerMutateAsyncMock).toHaveBeenCalledWith('t-1'))
  })

  it('inicia contagem de horas pelo card da tarefa', async () => {
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar horas de Montar base do painel' }))

    await waitFor(() => expect(iniciarTimerMutateAsyncMock).toHaveBeenCalledWith('t-1'))
    expect(screen.queryByRole('heading', { name: 'Editar tarefa' })).not.toBeInTheDocument()
  })

  it('para a tarefa em execucao ao iniciar outra pelo card', async () => {
    useTarefaTimerAtivoQueryMock.mockReturnValue({
      data: {
        sessao: {
          id: 's-2',
          tarefa: 't-2',
          tarefa_titulo: 'Outra tarefa em execução',
          colaborador: 1,
          colaborador_nome: 'Ana Souza',
          iniciado_em: new Date().toISOString(),
          finalizado_em: null,
          etapa: 'Cronometro',
          observacoes: '',
          apontamento: null,
          duracao_segundos: 0,
        },
      },
    })
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar horas de Montar base do painel' }))

    await waitFor(() => expect(pararTimerMutateAsyncMock).toHaveBeenCalled())
    await waitFor(() => expect(iniciarTimerMutateAsyncMock).toHaveBeenCalledWith('t-1'))
    expect(pararTimerMutateAsyncMock.mock.invocationCallOrder[0]).toBeLessThan(
      iniciarTimerMutateAsyncMock.mock.invocationCallOrder[0]
    )
  })

  it('para contagem ativa e registra horas pela tarefa', async () => {
    useTarefaTimerAtivoQueryMock.mockReturnValue({
      data: {
        sessao: {
          id: 's-1',
          tarefa: 't-1',
          tarefa_titulo: 'Montar base do painel',
          colaborador: 1,
          colaborador_nome: 'Ana Souza',
          iniciado_em: new Date().toISOString(),
          finalizado_em: null,
          etapa: 'Cronometro',
          observacoes: '',
          apontamento: null,
          duracao_segundos: 0,
        },
      },
    })
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    expect(screen.getByTestId('kanban-card-t-1')).toHaveClass('is-timing')

    fireEvent.click(screen.getByTestId('kanban-card-t-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Parar e registrar' }))

    await waitFor(() => expect(pararTimerMutateAsyncMock).toHaveBeenCalled())
  })

  it('para contagem de horas pelo card da tarefa', async () => {
    useTarefaTimerAtivoQueryMock.mockReturnValue({
      data: {
        sessao: {
          id: 's-1',
          tarefa: 't-1',
          tarefa_titulo: 'Montar base do painel',
          colaborador: 1,
          colaborador_nome: 'Ana Souza',
          iniciado_em: new Date().toISOString(),
          finalizado_em: null,
          etapa: 'Cronometro',
          observacoes: '',
          apontamento: null,
          duracao_segundos: 0,
        },
      },
    })
    useKanbanTarefasQueryMock.mockReturnValue({
      data: kanbanData(),
      isPending: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    })

    renderKanban()

    fireEvent.click(screen.getByRole('button', { name: 'Parar horas de Montar base do painel' }))

    await waitFor(() => expect(pararTimerMutateAsyncMock).toHaveBeenCalled())
  })
})
