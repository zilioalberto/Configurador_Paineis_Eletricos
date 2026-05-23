import type { DragEvent, MouseEvent } from 'react'
import type { TarefaKanbanItem } from '../types/tarefa'
import { TIPOS_ETAPA_OPTIONS } from '../utils/tarefasKanbanConstants'
import {
  formatarHoras,
  formatarPrazo,
  iniciaisResponsavel,
  prioridadeAccentClass,
  prioridadeClass,
  referenciasTarefa,
  tarefaEntregue,
  tarefaVencida,
} from '../utils/tarefasKanbanUtils'

function cardClassName(podeMover: boolean, arrastando: boolean, timerAtivo: boolean, prioridade: string) {
  return [
    'kanban-task-card',
    prioridadeAccentClass(prioridade),
    podeMover ? 'is-draggable' : '',
    arrastando ? 'is-dragging' : '',
    timerAtivo ? 'is-timing' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function TimerActionButton({
  tarefa,
  timerAtivo,
  isSavingTime,
  podeIniciarTimer,
  jornadaPermiteIniciarTimer,
  onStartTimer,
  onStopTimer,
}: Readonly<{
  tarefa: TarefaKanbanItem
  timerAtivo: boolean
  isSavingTime: boolean
  podeIniciarTimer: boolean
  jornadaPermiteIniciarTimer: boolean
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>) {
  const handleTimerButtonClick = (
    event: MouseEvent<HTMLButtonElement>,
    action: () => Promise<void>
  ) => {
    event.preventDefault()
    event.stopPropagation()
    action().catch(() => undefined)
  }

  if (timerAtivo) {
    return (
      <button
        type="button"
        className="kanban-task-card__time-button kanban-task-card__time-button--stop"
        aria-label={`Parar horas de ${tarefa.titulo}`}
        title="Parar horas"
        disabled={isSavingTime}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => handleTimerButtonClick(event, onStopTimer)}
      >
        <span aria-hidden="true" />
      </button>
    )
  }

  const title = !jornadaPermiteIniciarTimer
    ? 'Fora da jornada de trabalho (cadastro em RH).'
    : podeIniciarTimer
      ? 'Iniciar horas'
      : 'Classifique a tarefa (orçamento/OP) antes de iniciar o cronômetro.'

  return (
    <button
      type="button"
      className="kanban-task-card__time-button kanban-task-card__time-button--play"
      aria-label={`Iniciar horas de ${tarefa.titulo}`}
      title={title}
      disabled={isSavingTime || !podeIniciarTimer}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => handleTimerButtonClick(event, () => onStartTimer(tarefa))}
    >
      <span aria-hidden="true" />
    </button>
  )
}

export function TarefaCard({
  tarefa,
  podeMover,
  podeApontarHoras,
  arrastando,
  timerAtivo,
  tempoAtivoLabel,
  isSavingTime,
  jornadaPermiteIniciarTimer = true,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onOpen,
  onStartTimer,
  onStopTimer,
}: Readonly<{
  tarefa: TarefaKanbanItem
  podeMover: boolean
  podeApontarHoras: boolean
  arrastando: boolean
  timerAtivo: boolean
  tempoAtivoLabel: string | null
  isSavingTime: boolean
  jornadaPermiteIniciarTimer?: boolean
  onDragStart: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onDragEnd: () => void
  onDropBefore: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onOpen: (tarefa: TarefaKanbanItem) => void
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>) {
  const referencias = referenciasTarefa(tarefa)
  const responsavelNome = tarefa.responsavel_nome ?? 'Sem responsável'
  const totalColaboradores = (tarefa.colaboradores_nomes ?? []).length
  const prazoVencido = tarefaVencida(tarefa)
  const totalHorasLabel = formatarHoras(tarefa.total_horas_apontadas ?? '0.00')
  const podeControlarTimer = podeApontarHoras && !tarefaEntregue(tarefa)
  const podeIniciarTimer = tarefa.pode_iniciar !== false && jornadaPermiteIniciarTimer
  const rotuloTipoEtapa =
    tarefa.tipo_etapa_display ??
    TIPOS_ETAPA_OPTIONS.find((opcao) => opcao.value === tarefa.tipo_etapa)?.label
  const mostrarTipoEtapa =
    Boolean(tarefa.tipo_etapa && tarefa.tipo_etapa !== 'NAO_CLASSIFICADA') && Boolean(rotuloTipoEtapa)

  return (
    <article
      className={cardClassName(podeMover, arrastando, timerAtivo, tarefa.prioridade)}
      draggable={podeMover}
      data-testid={`kanban-card-${tarefa.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Abrir tarefa ${tarefa.titulo}`}
      onClick={() => onOpen(tarefa)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen(tarefa)
      }}
      onDragStart={(event) => onDragStart(event, tarefa)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!podeMover) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => onDropBefore(event, tarefa)}
    >
      <div className="kanban-task-card__topline">
        <span className="kanban-task-card__bar" aria-hidden="true" />
        <span className="kanban-task-card__menu" aria-hidden="true">
          ...
        </span>
      </div>
      <div className="kanban-task-card__title-row">
        <h3 className="kanban-task-card__title">{tarefa.titulo}</h3>
        <span className={`kanban-priority-badge ${prioridadeClass(tarefa.prioridade)}`}>
          {tarefa.prioridade_display}
        </span>
      </div>
      {mostrarTipoEtapa ? (
        <p className="kanban-task-card__description kanban-task-card__tipo-etapa small mb-0">
          {rotuloTipoEtapa}
        </p>
      ) : null}
      {tarefa.descricao ? (
        <p className="kanban-task-card__description">{tarefa.descricao}</p>
      ) : null}
      <div className="kanban-task-card__people-row">
        <span className="kanban-task-card__avatar" aria-hidden="true">
          {iniciaisResponsavel(tarefa.responsavel_nome)}
        </span>
        <span className="kanban-task-card__assignee">{responsavelNome}</span>
        {totalColaboradores > 0 ? (
          <span className="kanban-task-card__collaborators">
            +{totalColaboradores} colab.
          </span>
        ) : null}
      </div>
      <div className="kanban-task-card__metrics">
        <span className={prazoVencido ? 'is-danger' : undefined}>
          Prazo {formatarPrazo(tarefa.prazo)}
        </span>
        <span>{tarefa.status_display}</span>
      </div>
      <div className="kanban-task-card__time-row">
        <div
          className="kanban-task-card__spent"
          aria-label={`Total de horas gastas: ${totalHorasLabel}`}
        >
          <span>Total</span>
          <strong>{totalHorasLabel}</strong>
        </div>
        {podeControlarTimer ? (
          <div className="kanban-task-card__time-actions">
            <TimerActionButton
              tarefa={tarefa}
              timerAtivo={timerAtivo}
              isSavingTime={isSavingTime}
              podeIniciarTimer={podeIniciarTimer}
              jornadaPermiteIniciarTimer={jornadaPermiteIniciarTimer}
              onStartTimer={onStartTimer}
              onStopTimer={onStopTimer}
            />
          </div>
        ) : null}
      </div>
      {timerAtivo && tempoAtivoLabel ? (
        <div className="kanban-task-card__timer" aria-label="Tempo em contagem">
          <span className="kanban-task-card__timer-icon" aria-hidden="true" />
          {tempoAtivoLabel}
        </div>
      ) : null}
      {referencias.length > 0 ? (
        <div className="kanban-task-card__refs">
          {referencias.map((referencia) => (
            <span key={referencia}>{referencia}</span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
