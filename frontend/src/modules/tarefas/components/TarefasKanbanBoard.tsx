import type { DragEvent } from 'react'
import type { ColunaRenderizada } from '../utils/tarefasKanbanConstants'
import type { TarefaKanbanItem } from '../types/tarefa'
import { colunaStatusClass, formatarTempo } from '../utils/tarefasKanbanUtils'
import { TarefaCard } from './TarefaCard'

type TarefasKanbanBoardProps = Readonly<{
  quadroNome: string
  colunas: ColunaRenderizada[]
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
  onDragLeaveColumn: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLElement>, colunaId: string, ordem: number) => void
  onDragStart: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onDragEnd: () => void
  onOpenTarefa: (tarefa: TarefaKanbanItem) => void
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
  onNovaTarefa: () => void
}>

/** Board Kanban com colunas arrastáveis e cartões de tarefa. */
export function TarefasKanbanBoard({
  quadroNome,
  colunas,
  podeMover,
  podeCriar,
  podeApontarHoras,
  jornadaPermiteIniciarTimer,
  draggingTaskId,
  dragOverColumnId,
  sessaoTarefaAtivaId,
  timerAtivoSegundos,
  isSavingTime,
  onDragOverColumn,
  onDragLeaveColumn,
  onDrop,
  onDragStart,
  onDragEnd,
  onOpenTarefa,
  onStartTimer,
  onStopTimer,
  onNovaTarefa,
}: TarefasKanbanBoardProps) {
  return (
    <section className="kanban-board" aria-label={`Kanban ${quadroNome}`}>
      {colunas.map((coluna) => (
        <div
          className={`kanban-column ${colunaStatusClass(coluna.status_semantico)} ${
            dragOverColumnId === coluna.id ? 'is-drag-over' : ''
          }`}
          key={coluna.id}
          data-testid={`kanban-column-${coluna.id}`}
          onDragOver={(event) => {
            if (!podeMover) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            onDragOverColumn(coluna.id)
          }}
          onDragLeave={onDragLeaveColumn}
          onDrop={(event) => onDrop(event, coluna.id, coluna.tarefas.length)}
        >
          <div className="kanban-column__header">
            <div>
              <h2>{coluna.nome}</h2>
              <span>{coluna.status_semantico_display}</span>
            </div>
            <div className="kanban-column__header-actions">
              <strong>{coluna.tarefas.length}</strong>
              <span aria-hidden="true">...</span>
            </div>
          </div>
          {coluna.limite_wip ? (
            <div
              className={`kanban-column__wip ${
                coluna.tarefas.length > coluna.limite_wip ? 'is-over' : ''
              }`}
            >
              WIP {coluna.tarefas.length}/{coluna.limite_wip}
            </div>
          ) : null}
          <div className="kanban-column__tasks">
            {coluna.tarefasVisiveis.length === 0 ? (
              <p className="kanban-column__empty">Sem tarefas nesta coluna.</p>
            ) : (
              coluna.tarefasVisiveis.map((tarefa) => (
                <TarefaCard
                  tarefa={tarefa}
                  key={tarefa.id}
                  podeMover={podeMover}
                  podeApontarHoras={podeApontarHoras}
                  jornadaPermiteIniciarTimer={jornadaPermiteIniciarTimer}
                  arrastando={draggingTaskId === tarefa.id}
                  timerAtivo={sessaoTarefaAtivaId === tarefa.id}
                  tempoAtivoLabel={
                    sessaoTarefaAtivaId === tarefa.id ? formatarTempo(timerAtivoSegundos) : null
                  }
                  isSavingTime={isSavingTime}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDropBefore={(event, alvo) => onDrop(event, coluna.id, alvo.ordem)}
                  onOpen={onOpenTarefa}
                  onStartTimer={onStartTimer}
                  onStopTimer={onStopTimer}
                />
              ))
            )}
          </div>
          {podeCriar ? (
            <button type="button" className="kanban-column__add" onClick={onNovaTarefa}>
              + Adicionar tarefa
            </button>
          ) : null}
        </div>
      ))}
    </section>
  )
}
