import { describe, expect, it } from 'vitest'
import type { KanbanTarefasResponse, TarefaKanbanItem } from '../types/tarefa'
import { moverTarefaNoKanbanLocal } from './kanbanLocalState'

function tarefa(id: string, coluna: string, ordem: number): TarefaKanbanItem {
  return {
    id,
    titulo: id,
    descricao: '',
    coluna,
    responsavel: null,
    responsavel_nome: null,
    colaboradores: [],
    colaboradores_nomes: [],
    prioridade: 'MEDIA',
    prioridade_display: 'Media',
    prazo: null,
    status: 'ABERTA',
    status_display: 'Aberta',
    pode_excluir: false,
    proposta_referencia: '',
    ordem_producao_referencia: '',
    horas_estipuladas: null,
    ordem,
    concluida_em: null,
    total_horas_apontadas: '0.00',
  }
}

function estado(): KanbanTarefasResponse {
  return {
    quadro: {
      id: 'q-1',
      nome: 'Execução',
      descricao: '',
      equipe: '',
      ativo: true,
      total_tarefas: 3,
      colunas: [
        {
          id: 'c-1',
          quadro: 'q-1',
          nome: 'Pendentes',
          ordem: 0,
          status_semantico: 'PENDENTE',
          status_semantico_display: 'Pendente',
          limite_wip: null,
          tarefas: [tarefa('t-1', 'c-1', 0), tarefa('t-2', 'c-1', 1)],
        },
        {
          id: 'c-2',
          quadro: 'q-1',
          nome: 'Trabalhando',
          ordem: 1,
          status_semantico: 'EM_ANDAMENTO',
          status_semantico_display: 'Em andamento',
          limite_wip: null,
          tarefas: [tarefa('t-3', 'c-2', 0)],
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

describe('moverTarefaNoKanbanLocal', () => {
  it('move tarefa entre colunas e reordena listas', () => {
    const result = moverTarefaNoKanbanLocal(estado(), 't-1', 'c-2', 0)

    expect(result?.quadro?.colunas[0].tarefas.map((item) => [item.id, item.ordem])).toEqual([
      ['t-2', 0],
    ])
    expect(result?.quadro?.colunas[1].tarefas.map((item) => [item.id, item.ordem])).toEqual([
      ['t-1', 0],
      ['t-3', 1],
    ])
  })
})
