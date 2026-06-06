import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ColunaRenderizada } from '../utils/tarefasKanbanConstants'
import type { TarefaKanbanItem } from '../types/tarefa'
import { TarefasKanbanBoard } from './TarefasKanbanBoard'

vi.mock('./TarefaCard', () => ({
  TarefaCard: ({
    tarefa,
    onOpen,
  }: {
    tarefa: TarefaKanbanItem
    onOpen: (t: TarefaKanbanItem) => void
  }) => (
    <button type="button" onClick={() => onOpen(tarefa)}>
      card-{tarefa.id}
    </button>
  ),
}))

function tarefa(id: string): TarefaKanbanItem {
  return {
    id,
    titulo: id,
    descricao: '',
    coluna: 'c-1',
    responsavel: null,
    responsavel_nome: null,
    colaboradores: [],
    colaboradores_nomes: [],
    prioridade: 'MEDIA',
    prioridade_display: 'Média',
    prazo: null,
    status: 'ABERTA',
    status_display: 'Aberta',
    proposta_referencia: '',
    ordem_producao_referencia: '',
    ordem: 0,
    concluida_em: null,
    total_horas_apontadas: '0',
  }
}

const colunas: ColunaRenderizada[] = [
  {
    id: 'c-1',
    quadro: 'q-1',
    nome: 'Pendentes',
    ordem: 0,
    status_semantico: 'PENDENTE',
    status_semantico_display: 'Pendente',
    limite_wip: 2,
    tarefas: [tarefa('t-1')],
    tarefasVisiveis: [tarefa('t-1')],
  },
]

describe('TarefasKanbanBoard', () => {
  it('renderiza coluna, WIP e abre tarefa pelo card', () => {
    const onOpenTarefa = vi.fn()
    render(
      <TarefasKanbanBoard
        quadroNome="Execução"
        colunas={colunas}
        podeMover
        podeCriar
        podeApontarHoras
        jornadaPermiteIniciarTimer
        draggingTaskId={null}
        dragOverColumnId={null}
        sessaoTarefaAtivaId={undefined}
        timerAtivoSegundos={0}
        isSavingTime={false}
        onDragOverColumn={vi.fn()}
        onDragLeaveColumn={vi.fn()}
        onDrop={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        onOpenTarefa={onOpenTarefa}
        onStartTimer={vi.fn(async () => undefined)}
        onStopTimer={vi.fn(async () => undefined)}
        onNovaTarefa={vi.fn()}
      />
    )

    expect(screen.getByRole('region', { name: 'Kanban Execução' })).toBeInTheDocument()
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
    expect(screen.getByText('WIP 1/2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'card-t-1' }))
    expect(onOpenTarefa).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1' }))
  })

  it('exibe botão de nova tarefa quando podeCriar', () => {
    const onNovaTarefa = vi.fn()
    render(
      <TarefasKanbanBoard
        quadroNome="Q"
        colunas={colunas}
        podeMover={false}
        podeCriar
        podeApontarHoras={false}
        jornadaPermiteIniciarTimer
        draggingTaskId={null}
        dragOverColumnId={null}
        sessaoTarefaAtivaId={undefined}
        timerAtivoSegundos={0}
        isSavingTime={false}
        onDragOverColumn={vi.fn()}
        onDragLeaveColumn={vi.fn()}
        onDrop={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        onOpenTarefa={vi.fn()}
        onStartTimer={vi.fn(async () => undefined)}
        onStopTimer={vi.fn(async () => undefined)}
        onNovaTarefa={onNovaTarefa}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar tarefa' }))
    expect(onNovaTarefa).toHaveBeenCalled()
  })
})
