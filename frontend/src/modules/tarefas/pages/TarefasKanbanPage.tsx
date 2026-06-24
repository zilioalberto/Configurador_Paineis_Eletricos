import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { TarefaCreateModal } from '../components/TarefaCreateModal'
import { TarefaEditModal } from '../components/TarefaEditModal'
import {
  KanbanEstadoVazio,
  KanbanFilterPanel,
  KanbanTopbar,
  KanbanViewsSwitch,
} from '../components/TarefasKanbanPageSections'
import { useKanbanTarefasQuery } from '../hooks/useKanbanTarefasQuery'
import { useTarefasKanbanHandlers } from '../hooks/useTarefasKanbanHandlers'
import {
  useAtualizarTarefaMutation,
  useClassificarTarefaMutation,
  useCriarQuadroPadraoTarefasMutation,
  useCriarTarefaMutation,
  useIniciarTimerTarefaMutation,
  useMoverTarefaMutation,
  usePararTimerTarefaMutation,
} from '../hooks/useTarefaMutations'
import { useTarefaDashboardHorasDiaQuery } from '../hooks/useTarefaDashboardHorasDiaQuery'
import { useTarefaTimerAtivoQuery } from '../hooks/useTarefaTimerAtivoQuery'
import type { TarefaKanbanItem } from '../types/tarefa'
import {
  VISUALIZACOES_TAREFAS,
  type ColunaRenderizada,
  type FiltroSituacao,
  type TarefaVisivel,
  type VisualizacaoTarefas,
} from '../utils/tarefasKanbanConstants'
import {
  dataLocalHoje,
  tarefaCombinaBusca,
  tarefaCombinaSituacao,
  tarefaVencida,
  usuarioPodeClassificarTarefa,
} from '../utils/tarefasKanbanUtils'

/** Página principal do Kanban de tarefas. */
export default function TarefasKanbanPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useKanbanTarefasQuery()
  const criarQuadroPadraoMutation = useCriarQuadroPadraoTarefasMutation()
  const criarMutation = useCriarTarefaMutation()
  const atualizarMutation = useAtualizarTarefaMutation()
  const classificarMutation = useClassificarTarefaMutation()
  const moverMutation = useMoverTarefaMutation()
  const iniciarTimerMutation = useIniciarTimerTarefaMutation()
  const pararTimerMutation = usePararTimerTarefaMutation()
  const { user } = useAuth()
  const quadro = data?.quadro ?? null
  const totalTarefas = quadro?.total_tarefas ?? 0
  const podeCriar = hasPermission(user, PERMISSION_KEYS.TAREFA_CRIAR)
  const podeVerRelatorioHoras = hasPermission(
    user,
    PERMISSION_KEYS.TAREFA_VISUALIZAR_RELATORIOS
  )
  const podeMover = hasPermission(user, PERMISSION_KEYS.TAREFA_EDITAR)
  const podeAlterarClassificacaoComApontamentos = hasPermission(
    user,
    PERMISSION_KEYS.TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS
  )
  const podeApontarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_APONTAR_HORAS)
  const dataDashboardHoras = useMemo(() => dataLocalHoje(), [])
  const dashboardHorasQuery = useTarefaDashboardHorasDiaQuery(
    user?.id,
    dataDashboardHoras,
    podeApontarHoras
  )
  const dashboardHoras = dashboardHorasQuery.data
  const timerQuery = useTarefaTimerAtivoQuery(podeApontarHoras)
  const sessaoAtiva = timerQuery.data?.sessao ?? null
  const jornadaPermiteIniciarTimer =
    timerQuery.data?.jornada_permite_iniciar_cronometro !== false
  const podeGerenciarQuadro = hasPermission(user, PERMISSION_KEYS.TAREFA_GERENCIAR_QUADRO)
  const podeCriarQuadroPadrao = podeCriar || podeGerenciarQuadro
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas')
  const [visualizacao, setVisualizacao] = useState<VisualizacaoTarefas>('kanban')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TarefaKanbanItem | null>(null)
  const [timerTick, setTimerTick] = useState(() => Date.now())

  const podeClassificar = useMemo(
    () =>
      editingTask ? usuarioPodeClassificarTarefa(user, editingTask) : false,
    [user, editingTask]
  )

  useEffect(() => {
    if (!sessaoAtiva) return undefined
    const intervalId = globalThis.setInterval(() => setTimerTick(Date.now()), 1000)
    return () => globalThis.clearInterval(intervalId)
  }, [sessaoAtiva])

  const handlers = useTarefasKanbanHandlers(
    user,
    {
      criar: criarMutation,
      atualizar: atualizarMutation,
      classificar: classificarMutation,
      mover: moverMutation,
      iniciarTimer: iniciarTimerMutation,
      pararTimer: pararTimerMutation,
      criarQuadro: criarQuadroPadraoMutation,
    },
    {
      sessaoAtiva,
      jornadaPermiteIniciar: jornadaPermiteIniciarTimer,
      jornadaMensagem: timerQuery.data?.jornada_mensagem,
      onTimerTick: () => setTimerTick(Date.now()),
    },
    editingTask,
    podeMover,
    draggingTaskId,
    {
      setCreateModalOpen,
      setEditingTask,
      setDraggingTaskId,
      setDragOverColumnId,
    }
  )

  const {
    handleCreateTarefa,
    handleSaveEdicaoTarefa,
    handleStartTimer,
    handleStopTimer,
    handleCriarQuadroPadrao,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    pararTimerAutomaticoJornada,
  } = handlers

  useEffect(() => {
    const iso = timerQuery.data?.pausa_automatica_prevista_em
    if (!iso || !sessaoAtiva) return undefined
    const ms = new Date(iso).getTime() - Date.now()
    if (Number.isNaN(ms) || ms <= 0 || ms > 86_400_000) return undefined
    const id = globalThis.setTimeout(pararTimerAutomaticoJornada, ms)
    return () => globalThis.clearTimeout(id)
  }, [timerQuery.data?.pausa_automatica_prevista_em, sessaoAtiva, pararTimerAutomaticoJornada])

  const tarefasVencidas = useMemo(() => {
    return (
      quadro?.colunas.reduce(
        (total, coluna) => total + coluna.tarefas.filter(tarefaVencida).length,
        0
      ) ?? 0
    )
  }, [quadro])

  const colunasRenderizadas = useMemo<ColunaRenderizada[]>(() => {
    const termo = busca.trim().toLowerCase()
    return (
      quadro?.colunas.map((coluna) => ({
        ...coluna,
        tarefasVisiveis: coluna.tarefas.filter(
          (tarefa) =>
            tarefaCombinaBusca(tarefa, termo) &&
            tarefaCombinaSituacao(tarefa, filtroSituacao)
        ),
      })) ?? []
    )
  }, [quadro, busca, filtroSituacao])

  const totalVisivel = useMemo(
    () => colunasRenderizadas.reduce((total, coluna) => total + coluna.tarefasVisiveis.length, 0),
    [colunasRenderizadas]
  )

  const tarefasVisiveis = useMemo<TarefaVisivel[]>(
    () =>
      colunasRenderizadas.flatMap((coluna) =>
        coluna.tarefasVisiveis.map((tarefa) => ({
          ...tarefa,
          colunaNome: coluna.nome,
          colunaStatus: coluna.status_semantico,
        }))
      ),
    [colunasRenderizadas]
  )

  const timerAtivoSegundos = useMemo(() => {
    if (!sessaoAtiva) return 0
    const inicio = new Date(sessaoAtiva.iniciado_em).getTime()
    if (Number.isNaN(inicio)) return 0
    return Math.max(0, Math.floor((timerTick - inicio) / 1000))
  }, [sessaoAtiva, timerTick])

  const abrirNovaTarefa = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  return (
    <div className="tarefas-kanban-page">
      <KanbanTopbar
        busca={busca}
        onBuscaChange={setBusca}
        onRefetch={() => refetch().catch(() => undefined)}
        isFetching={isFetching}
        podeVerRelatorioHoras={podeVerRelatorioHoras}
        podeCriar={podeCriar}
        quadroDisponivel={Boolean(quadro)}
        onNovaTarefa={abrirNovaTarefa}
      />

      {isPending ? (
        <div className="kanban-loading-state">
          <div className="card-body">Carregando Kanban...</div>
        </div>
      ) : null}

      {isError ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o Kanban de tarefas.
          {error && 'message' in error ? ` ${String(error.message)}` : ''}
        </div>
      ) : null}

      {!isPending && !isError && !quadro ? (
        <KanbanEstadoVazio
          podeCriarQuadroPadrao={podeCriarQuadroPadrao}
          criando={criarQuadroPadraoMutation.isPending}
          onCriar={handleCriarQuadroPadrao}
        />
      ) : null}

      {quadro ? (
        <>
          <section className="tarefas-board-titlebar" aria-label="Quadro ativo">
            <div className="tarefas-board-titlebar__identity">
              <strong>{quadro.nome}</strong>
              {quadro.equipe ? <span>{quadro.equipe}</span> : null}
            </div>
            <div className="tarefas-board-tabs" role="tablist" aria-label="Visualizações de tarefas">
              {VISUALIZACOES_TAREFAS.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={visualizacao === value ? 'is-active' : ''}
                  role="tab"
                  aria-selected={visualizacao === value}
                  onClick={() => setVisualizacao(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="kanban-workspace">
            <KanbanFilterPanel
              filtroSituacao={filtroSituacao}
              setFiltroSituacao={setFiltroSituacao}
              podeApontarHoras={podeApontarHoras}
              dashboardHoras={dashboardHoras}
              dashboardHorasPending={dashboardHorasQuery.isPending}
              dashboardHorasError={dashboardHorasQuery.isError}
              dataDashboardHoras={dataDashboardHoras}
              totalTarefas={totalTarefas}
              totalVisivel={totalVisivel}
              tarefasVencidas={tarefasVencidas}
            />

            <KanbanViewsSwitch
              visualizacao={visualizacao}
              quadroNome={quadro.nome}
              colunasRenderizadas={colunasRenderizadas}
              tarefasVisiveis={tarefasVisiveis}
              podeMover={podeMover}
              podeCriar={podeCriar}
              podeApontarHoras={podeApontarHoras}
              jornadaPermiteIniciarTimer={jornadaPermiteIniciarTimer}
              draggingTaskId={draggingTaskId}
              dragOverColumnId={dragOverColumnId}
              sessaoTarefaAtivaId={sessaoAtiva?.tarefa}
              timerAtivoSegundos={timerAtivoSegundos}
              isSavingTime={iniciarTimerMutation.isPending || pararTimerMutation.isPending}
              onDragOverColumn={setDragOverColumnId}
              setDragOverColumnId={setDragOverColumnId}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onOpenTarefa={setEditingTask}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              onNovaTarefa={abrirNovaTarefa}
            />
          </div>
        </>
      ) : null}

      {createModalOpen ? (
        <TarefaCreateModal
          colunas={quadro?.colunas ?? []}
          isSubmitting={criarMutation.isPending}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateTarefa}
        />
      ) : null}
      {editingTask ? (
        <TarefaEditModal
          tarefa={editingTask}
          colunas={quadro?.colunas ?? []}
          timerAtivo={sessaoAtiva?.tarefa === editingTask.id}
          tempoAtivoSegundos={
            sessaoAtiva?.tarefa === editingTask.id ? timerAtivoSegundos : 0
          }
          podeEditar={podeMover}
          podeClassificar={podeClassificar}
          podeAlterarClassificacaoComApontamentos={podeAlterarClassificacaoComApontamentos}
          podeApontarHoras={podeApontarHoras}
          isSubmitting={
            atualizarMutation.isPending || classificarMutation.isPending
          }
          isSavingTime={iniciarTimerMutation.isPending || pararTimerMutation.isPending}
          onClose={() => setEditingTask(null)}
          onSaveEdicao={handleSaveEdicaoTarefa}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
        />
      ) : null}
    </div>
  )
}
