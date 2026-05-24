/** Atualização otimista do estado local ao mover tarefa entre colunas. */

import type {
  ColunaKanban,
  KanbanTarefasResponse,
  TarefaKanbanItem,
} from '../types/tarefa'

function ordenarTarefas(tarefas: TarefaKanbanItem[]): TarefaKanbanItem[] {
  return tarefas.map((tarefa, ordem) => ({ ...tarefa, ordem }))
}

/** Atualização otimista do estado local ao mover tarefa entre colunas. */

export function moverTarefaNoKanbanLocal(
  atual: KanbanTarefasResponse | undefined,
  tarefaId: string,
  colunaDestinoId: string,
  ordemDestino: number,
  tarefaAtualizada?: TarefaKanbanItem
): KanbanTarefasResponse | undefined {
  if (!atual?.quadro) return atual

  let tarefaMovida: TarefaKanbanItem | null = null
  const colunasSemTarefa = atual.quadro.colunas.map<ColunaKanban>((coluna) => {
    const tarefas = coluna.tarefas.filter((tarefa) => {
      if (tarefa.id !== tarefaId) return true
      tarefaMovida = tarefa
      return false
    })
    return { ...coluna, tarefas: ordenarTarefas(tarefas) }
  })

  if (!tarefaMovida && !tarefaAtualizada) return atual

  const colunas = colunasSemTarefa.map<ColunaKanban>((coluna) => {
    if (coluna.id !== colunaDestinoId) return coluna

    const tarefaBase = tarefaAtualizada ?? tarefaMovida
    if (!tarefaBase) return coluna

    const ordemSegura = Math.max(0, Math.min(ordemDestino, coluna.tarefas.length))
    const tarefas = [...coluna.tarefas]
    tarefas.splice(ordemSegura, 0, {
      ...tarefaBase,
      coluna: colunaDestinoId,
    })

    return {
      ...coluna,
      tarefas: ordenarTarefas(tarefas),
    }
  })

  return {
    ...atual,
    quadro: {
      ...atual.quadro,
      colunas,
    },
  }
}
