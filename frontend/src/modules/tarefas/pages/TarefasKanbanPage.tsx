import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { TarefaCreateModal } from '../components/TarefaCreateModal'
import { TarefasKanbanBoard } from '../components/TarefasKanbanBoard'
import { TarefaEditModal } from '../components/TarefaEditModal'
import {
  TarefasCalendarioView,
  TarefasDashboardView,
  TarefasListaView,
} from '../components/TarefasKanbanViews'
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
  FILTROS_SITUACAO,
  VISUALIZACOES_TAREFAS,
  type ColunaRenderizada,
  type FiltroSituacao,
  type TarefaVisivel,
  type VisualizacaoTarefas,
} from '../utils/tarefasKanbanConstants'
import {
  dataLocalHoje,
  formatarDataApontamento,
  formatarHoras,
  tarefaCombinaBusca,
  tarefaCombinaSituacao,
  tarefaVencida,
  usuarioPodeClassificarTarefa,
} from '../utils/tarefasKanbanUtils'

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
  }, [timerQuery.data?.pausa_automatica_prevista_em, sessaoAtiva?.id, pararTimerAutomaticoJornada])

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
      <header className="tarefas-board-topbar">
        <div className="tarefas-board-brand">
          <span className="tarefas-board-brand__mark" aria-hidden="true">
            Z
          </span>
          <div>
            <div className="tarefas-board-brand__section">Quadros</div>
            <h1 className="tarefas-board-brand__title">Tarefas e Kanban</h1>
          </div>
        </div>

        <div className="tarefas-board-search input-group input-group-sm">
          <span className="input-group-text border-end-0 bg-body-secondary" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </span>
          <label className="visually-hidden" htmlFor="tarefas-busca">
            Buscar tarefas
          </label>
          <input
            id="tarefas-busca"
            className="form-control border-start-0"
            value={busca}
            placeholder="Código, título, responsável…"
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
        <div className="tarefas-kanban-toolbar__actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => refetch().catch(() => undefined)}
            disabled={isFetching}
          >
            Atualizar
          </button>
          {podeVerRelatorioHoras ? (
            <Link to="/tarefas/horas-gestao" className="btn btn-sm btn-outline-secondary">
              Gestão de horas
            </Link>
          ) : null}
          {podeCriar ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => abrirNovaTarefa()}
              disabled={!quadro}
            >
              Nova tarefa
            </button>
          ) : null}
        </div>
      </header>

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
        <div className="kanban-empty-state">
          <h2 className="h5 mb-2">Nenhum quadro ativo encontrado</h2>
          <p className="text-muted mb-3">
            Crie um quadro padrão com colunas iniciais para liberar o cadastro de tarefas.
          </p>
          {podeCriarQuadroPadrao ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleCriarQuadroPadrao}
              disabled={criarQuadroPadraoMutation.isPending}
            >
              {criarQuadroPadraoMutation.isPending ? 'Criando...' : 'Criar quadro padrão'}
            </button>
          ) : (
            <p className="text-muted small mb-0">
              Seu usuário pode visualizar tarefas, mas precisa da permissão de gerenciar quadros
              ou criar tarefas para iniciar a estrutura padrão.
            </p>
          )}
        </div>
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
            <aside className="kanban-filter-panel" aria-label="Filtros do Kanban">
              <div className="kanban-filter-panel__section">
                <label className="form-label" htmlFor="tarefas-situacao">
                  Situação
                </label>
                <select
                  id="tarefas-situacao"
                  className="form-select form-select-sm"
                  value={filtroSituacao}
                  onChange={(event) => setFiltroSituacao(event.target.value as FiltroSituacao)}
                >
                  {FILTROS_SITUACAO.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {podeApontarHoras ? (
                <div
                  className="kanban-filter-panel__section kanban-hours-dashboard"
                  aria-label="Total das minhas horas apontadas hoje em tarefas"
                >
                  <h2>Minhas horas hoje</h2>
                  <div className="kanban-hours-dashboard__total">
                    <strong>{formatarHoras(dashboardHoras?.total_horas ?? '0.00')}</strong>
                    <span>{formatarDataApontamento(dashboardHoras?.data ?? dataDashboardHoras)}</span>
                  </div>
                  {dashboardHorasQuery.isPending ? (
                    <p className="kanban-hours-dashboard__note mb-0">Carregando horas...</p>
                  ) : null}
                  {dashboardHorasQuery.isError ? (
                    <p className="kanban-hours-dashboard__note mb-0">
                      Não foi possível carregar as horas.
                    </p>
                  ) : null}
                  {!dashboardHorasQuery.isPending &&
                  !dashboardHorasQuery.isError &&
                  Number(dashboardHoras?.total_horas ?? '0') === 0 ? (
                    <p className="kanban-hours-dashboard__note mb-0">Sem horas apontadas hoje.</p>
                  ) : null}
                  {!dashboardHorasQuery.isPending &&
                  !dashboardHorasQuery.isError &&
                  Number(dashboardHoras?.total_horas ?? '0') > 0 ? (
                    <p className="kanban-hours-dashboard__note mb-0">
                      Soma das suas horas apontadas neste dia (exceto canceladas ou rejeitadas).
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="kanban-filter-panel__section">
                <h2>Ativos</h2>
                <div className="kanban-filter-panel__stats">
                  <span>
                    <strong>{totalTarefas}</strong>
                    tarefas no quadro
                  </span>
                  <span>
                    <strong>{totalVisivel}</strong>
                    tarefas filtradas
                  </span>
                  <span>
                    <strong>{tarefasVencidas}</strong>
                    vencidas
                  </span>
                </div>
              </div>

              <div className="kanban-filter-panel__section">
                <h2>Filtros rápidos</h2>
                <fieldset className="kanban-filter-panel__group" aria-label="Situação">
                  {FILTROS_SITUACAO.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`kanban-filter-panel__option ${
                        filtroSituacao === value ? 'is-active' : ''
                      }`}
                      onClick={() => setFiltroSituacao(value)}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </div>

              <div className="kanban-filter-panel__section">
                <h2>Filtros avançados</h2>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'vencidas'}
                    onChange={() =>
                      setFiltroSituacao((estado) => (estado === 'vencidas' ? 'todas' : 'vencidas'))
                    }
                  />
                  Vencidas
                </label>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'concluidas'}
                    onChange={() =>
                      setFiltroSituacao((estado) =>
                        estado === 'concluidas' ? 'todas' : 'concluidas'
                      )
                    }
                  />
                  Entregue
                </label>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'abertas'}
                    onChange={() =>
                      setFiltroSituacao((estado) => (estado === 'abertas' ? 'todas' : 'abertas'))
                    }
                  />
                  Abertas
                </label>
              </div>
            </aside>

            {visualizacao === 'kanban' ? (
              <TarefasKanbanBoard
                quadroNome={quadro.nome}
                colunas={colunasRenderizadas}
                podeMover={podeMover}
                podeCriar={podeCriar}
                podeApontarHoras={podeApontarHoras}
                jornadaPermiteIniciarTimer={jornadaPermiteIniciarTimer}
                draggingTaskId={draggingTaskId}
                dragOverColumnId={dragOverColumnId}
                sessaoTarefaAtivaId={sessaoAtiva?.tarefa}
                timerAtivoSegundos={timerAtivoSegundos}
                isSavingTime={
                  iniciarTimerMutation.isPending || pararTimerMutation.isPending
                }
                onDragOverColumn={setDragOverColumnId}
                onDragLeaveColumn={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setDragOverColumnId(null)
                  }
                }}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onOpenTarefa={setEditingTask}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onNovaTarefa={abrirNovaTarefa}
              />
            ) : null}

            {visualizacao === 'lista' ? (
              <TarefasListaView tarefas={tarefasVisiveis} onOpen={setEditingTask} />
            ) : null}
            {visualizacao === 'calendario' ? (
              <TarefasCalendarioView tarefas={tarefasVisiveis} onOpen={setEditingTask} />
            ) : null}
            {visualizacao === 'dashboard' ? (
              <TarefasDashboardView tarefas={tarefasVisiveis} colunas={colunasRenderizadas} />
            ) : null}
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
