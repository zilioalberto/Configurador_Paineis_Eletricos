/**
 * Seções de UI extraídas da `TarefasKanbanPage` para reduzir a complexidade
 * cognitiva da página principal (cada bloco vira um componente focado).
 */
import type { Dispatch, DragEvent, SetStateAction } from 'react'
import { Link } from 'react-router-dom'

import { TarefasKanbanBoard } from './TarefasKanbanBoard'
import {
  TarefasCalendarioView,
  TarefasDashboardView,
  TarefasListaView,
} from './TarefasKanbanViews'
import type { TarefaKanbanItem } from '../types/tarefa'
import {
  FILTROS_SITUACAO,
  type ColunaRenderizada,
  type FiltroSituacao,
  type TarefaVisivel,
  type VisualizacaoTarefas,
} from '../utils/tarefasKanbanConstants'
import { formatarDataApontamento, formatarHoras } from '../utils/tarefasKanbanUtils'

type DashboardHoras = { total_horas?: string; data?: string } | undefined

export type KanbanTopbarProps = Readonly<{
  busca: string
  onBuscaChange: (valor: string) => void
  onRefetch: () => void
  isFetching: boolean
  podeVerRelatorioHoras: boolean
  podeCriar: boolean
  quadroDisponivel: boolean
  onNovaTarefa: () => void
}>

export function KanbanTopbar({
  busca,
  onBuscaChange,
  onRefetch,
  isFetching,
  podeVerRelatorioHoras,
  podeCriar,
  quadroDisponivel,
  onNovaTarefa,
}: KanbanTopbarProps) {
  return (
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
          onChange={(event) => onBuscaChange(event.target.value)}
        />
      </div>
      <div className="tarefas-kanban-toolbar__actions">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={onRefetch}
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
            onClick={onNovaTarefa}
            disabled={!quadroDisponivel}
          >
            Nova tarefa
          </button>
        ) : null}
      </div>
    </header>
  )
}

export type KanbanEstadoVazioProps = Readonly<{
  podeCriarQuadroPadrao: boolean
  criando: boolean
  onCriar: () => void
}>

export function KanbanEstadoVazio({
  podeCriarQuadroPadrao,
  criando,
  onCriar,
}: KanbanEstadoVazioProps) {
  return (
    <div className="kanban-empty-state">
      <h2 className="h5 mb-2">Nenhum quadro ativo encontrado</h2>
      <p className="text-muted mb-3">
        Crie um quadro padrão com colunas iniciais para liberar o cadastro de tarefas.
      </p>
      {podeCriarQuadroPadrao ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={onCriar}
          disabled={criando}
        >
          {criando ? 'Criando...' : 'Criar quadro padrão'}
        </button>
      ) : (
        <p className="text-muted small mb-0">
          Seu usuário pode visualizar tarefas, mas precisa da permissão de gerenciar quadros ou
          criar tarefas para iniciar a estrutura padrão.
        </p>
      )}
    </div>
  )
}

type KanbanHorasDashboardProps = Readonly<{
  dashboardHoras: DashboardHoras
  isPending: boolean
  isError: boolean
  dataReferencia: string
}>

function KanbanHorasDashboard({
  dashboardHoras,
  isPending,
  isError,
  dataReferencia,
}: KanbanHorasDashboardProps) {
  const totalHoras = Number(dashboardHoras?.total_horas ?? '0')
  const carregado = !isPending && !isError
  return (
    <div
      className="kanban-filter-panel__section kanban-hours-dashboard"
      aria-label="Total das minhas horas apontadas hoje em tarefas"
    >
      <h2>Minhas horas hoje</h2>
      <div className="kanban-hours-dashboard__total">
        <strong>{formatarHoras(dashboardHoras?.total_horas ?? '0.00')}</strong>
        <span>{formatarDataApontamento(dashboardHoras?.data ?? dataReferencia)}</span>
      </div>
      {isPending ? (
        <p className="kanban-hours-dashboard__note mb-0">Carregando horas...</p>
      ) : null}
      {isError ? (
        <p className="kanban-hours-dashboard__note mb-0">Não foi possível carregar as horas.</p>
      ) : null}
      {carregado && totalHoras === 0 ? (
        <p className="kanban-hours-dashboard__note mb-0">Sem horas apontadas hoje.</p>
      ) : null}
      {carregado && totalHoras > 0 ? (
        <p className="kanban-hours-dashboard__note mb-0">
          Soma das suas horas apontadas neste dia (exceto canceladas ou rejeitadas).
        </p>
      ) : null}
    </div>
  )
}

export type KanbanFilterPanelProps = Readonly<{
  filtroSituacao: FiltroSituacao
  setFiltroSituacao: Dispatch<SetStateAction<FiltroSituacao>>
  podeApontarHoras: boolean
  dashboardHoras: DashboardHoras
  dashboardHorasPending: boolean
  dashboardHorasError: boolean
  dataDashboardHoras: string
  totalTarefas: number
  totalVisivel: number
  tarefasVencidas: number
}>

function alternarFiltro(estado: FiltroSituacao, alvo: FiltroSituacao): FiltroSituacao {
  return estado === alvo ? 'todas' : alvo
}

export function KanbanFilterPanel({
  filtroSituacao,
  setFiltroSituacao,
  podeApontarHoras,
  dashboardHoras,
  dashboardHorasPending,
  dashboardHorasError,
  dataDashboardHoras,
  totalTarefas,
  totalVisivel,
  tarefasVencidas,
}: KanbanFilterPanelProps) {
  return (
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
        <KanbanHorasDashboard
          dashboardHoras={dashboardHoras}
          isPending={dashboardHorasPending}
          isError={dashboardHorasError}
          dataReferencia={dataDashboardHoras}
        />
      ) : null}

      <div className="kanban-filter-panel__section">
        <h2>Ativos</h2>
        <div className="kanban-filter-panel__stats">
          <span>
            <strong>{totalTarefas}</strong>{' '}
            tarefas no quadro
          </span>
          <span>
            <strong>{totalVisivel}</strong>{' '}
            tarefas filtradas
          </span>
          <span>
            <strong>{tarefasVencidas}</strong>{' '}
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
            onChange={() => setFiltroSituacao((estado) => alternarFiltro(estado, 'vencidas'))}
          />{' '}
          Vencidas
        </label>
        <label className="kanban-filter-panel__check">
          <input
            type="checkbox"
            checked={filtroSituacao === 'concluidas'}
            onChange={() => setFiltroSituacao((estado) => alternarFiltro(estado, 'concluidas'))}
          />{' '}
          Entregue
        </label>
        <label className="kanban-filter-panel__check">
          <input
            type="checkbox"
            checked={filtroSituacao === 'abertas'}
            onChange={() => setFiltroSituacao((estado) => alternarFiltro(estado, 'abertas'))}
          />{' '}
          Abertas
        </label>
      </div>
    </aside>
  )
}

export type KanbanViewsSwitchProps = Readonly<{
  visualizacao: VisualizacaoTarefas
  quadroNome: string
  colunasRenderizadas: ColunaRenderizada[]
  tarefasVisiveis: TarefaVisivel[]
  podeMover: boolean
  podeCriar: boolean
  podeApontarHoras: boolean
  jornadaPermiteIniciarTimer: boolean
  draggingTaskId: string | null
  dragOverColumnId: string | null
  sessaoTarefaAtivaId: string | undefined
  timerAtivoSegundos: number
  isSavingTime: boolean
  onDragOverColumn: (colunaId: string) => void
  setDragOverColumnId: (columnId: string | null) => void
  onDrop: (event: DragEvent<HTMLElement>, colunaId: string, ordem: number) => void
  onDragStart: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onDragEnd: () => void
  onOpenTarefa: (tarefa: TarefaKanbanItem) => void
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
  onNovaTarefa: () => void
}>

export function KanbanViewsSwitch(props: KanbanViewsSwitchProps) {
  const { visualizacao, tarefasVisiveis, colunasRenderizadas, onOpenTarefa } = props

  if (visualizacao === 'kanban') {
    return (
      <TarefasKanbanBoard
        quadroNome={props.quadroNome}
        colunas={props.colunasRenderizadas}
        podeMover={props.podeMover}
        podeCriar={props.podeCriar}
        podeApontarHoras={props.podeApontarHoras}
        jornadaPermiteIniciarTimer={props.jornadaPermiteIniciarTimer}
        draggingTaskId={props.draggingTaskId}
        dragOverColumnId={props.dragOverColumnId}
        sessaoTarefaAtivaId={props.sessaoTarefaAtivaId}
        timerAtivoSegundos={props.timerAtivoSegundos}
        isSavingTime={props.isSavingTime}
        onDragOverColumn={props.onDragOverColumn}
        onDragLeaveColumn={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            props.setDragOverColumnId(null)
          }
        }}
        onDrop={props.onDrop}
        onDragStart={props.onDragStart}
        onDragEnd={props.onDragEnd}
        onOpenTarefa={props.onOpenTarefa}
        onStartTimer={props.onStartTimer}
        onStopTimer={props.onStopTimer}
        onNovaTarefa={props.onNovaTarefa}
      />
    )
  }
  if (visualizacao === 'lista') {
    return <TarefasListaView tarefas={tarefasVisiveis} onOpen={onOpenTarefa} />
  }
  if (visualizacao === 'calendario') {
    return <TarefasCalendarioView tarefas={tarefasVisiveis} onOpen={onOpenTarefa} />
  }
  if (visualizacao === 'dashboard') {
    return <TarefasDashboardView tarefas={tarefasVisiveis} colunas={colunasRenderizadas} />
  }
  return null
}
