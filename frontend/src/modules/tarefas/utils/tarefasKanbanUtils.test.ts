import { describe, expect, it, vi } from 'vitest'
import type { TarefaKanbanItem } from '../types/tarefa'
import {
  colunaStatusClass,
  horasEstipuladasFormParaApi,
  tarefaCombinaBusca,
  tarefaCombinaSituacao,
  tarefaEntregue,
  tarefaFormToPayloadNovaTarefa,
  tarefaPayloadSemClassificacao,
  tarefaVencida,
  toggleColaborador,
  totalizarHoras,
  usuarioPodeClassificarTarefa,
} from './tarefasKanbanUtils'
import type { TarefaFormState } from './tarefasKanbanConstants'

function tarefa(overrides: Partial<TarefaKanbanItem> = {}): TarefaKanbanItem {
  return {
    id: 't-1',
    titulo: 'Montar painel',
    descricao: 'Detalhe interno',
    coluna: 'c-1',
    responsavel: 1,
    responsavel_nome: 'Ana Souza',
    colaboradores: [2],
    colaboradores_nomes: ['Bruno Lima'],
    prioridade: 'MEDIA',
    prioridade_display: 'Média',
    prazo: null,
    status: 'ABERTA',
    status_display: 'Aberta',
    proposta_referencia: 'ORC-10',
    ordem_producao_referencia: '',
    ordem: 0,
    concluida_em: null,
    total_horas_apontadas: '1.00',
    ...overrides,
  }
}

const formBase: TarefaFormState = {
  titulo: ' Nova ',
  descricao: ' Desc ',
  coluna: 'c-1',
  responsavel: '1',
  colaboradores: ['2'],
  prioridade: 'ALTA',
  prazo: '',
  tipo_etapa: 'PROPOSTA',
  proposta_referencia: ' ORC-99 ',
  ordem_producao_referencia: ' OP-1 ',
  horas_estipuladas: '2,5',
}

describe('tarefasKanbanUtils', () => {
  it('colunaStatusClass mapeia status semânticos', () => {
    expect(colunaStatusClass('FINALIZADA')).toBe('kanban-column--done')
    expect(colunaStatusClass('EM_ANDAMENTO')).toBe('kanban-column--active')
    expect(colunaStatusClass('BLOQUEADO')).toBe('kanban-column--blocked')
    expect(colunaStatusClass('OUTRO')).toBe('kanban-column--pending')
  })

  it('horasEstipuladasFormParaApi normaliza vírgula e vazio', () => {
    expect(horasEstipuladasFormParaApi('')).toBeNull()
    expect(horasEstipuladasFormParaApi('3,75')).toBe('3.75')
    expect(horasEstipuladasFormParaApi('-1')).toBeNull()
  })

  it('totalizarHoras soma apontamentos em centésimos', () => {
    expect(
      totalizarHoras([
        { horas: '1.25' } as never,
        { horas: '2.50' } as never,
      ])
    ).toBe('3.75')
  })

  it('tarefaCombinaBusca filtra por título, responsável e referências', () => {
    const item = tarefa()
    expect(tarefaCombinaBusca(item, '')).toBe(true)
    expect(tarefaCombinaBusca(item, 'montar')).toBe(true)
    expect(tarefaCombinaBusca(item, 'bruno')).toBe(true)
    expect(tarefaCombinaBusca(item, 'orc-10')).toBe(true)
    expect(tarefaCombinaBusca(item, 'inexistente')).toBe(false)
  })

  it('tarefaCombinaSituacao respeita abertas, vencidas e concluídas', () => {
    const aberta = tarefa({ status: 'ABERTA' })
    const entregue = tarefa({ status: 'CONCLUIDA' })
    expect(tarefaCombinaSituacao(aberta, 'abertas')).toBe(true)
    expect(tarefaCombinaSituacao(entregue, 'abertas')).toBe(false)
    expect(tarefaCombinaSituacao(entregue, 'concluidas')).toBe(true)
    expect(tarefaCombinaSituacao(aberta, 'todas')).toBe(true)
  })

  it('tarefaVencida ignora entregues e exige prazo no passado', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-21T12:00:00'))
    const vencida = tarefa({ prazo: '2026-05-20T10:00:00.000Z' })
    const futura = tarefa({ prazo: '2026-05-25T10:00:00.000Z' })
    expect(tarefaVencida(vencida)).toBe(true)
    expect(tarefaVencida(futura)).toBe(false)
    expect(tarefaVencida(tarefa({ status: 'CONCLUIDA', prazo: '2026-05-01T00:00:00.000Z' }))).toBe(
      false
    )
    vi.useRealTimers()
  })

  it('tarefaEntregue e usuarioPodeClassificarTarefa', () => {
    expect(tarefaEntregue(tarefa({ status: 'CONCLUIDA' }))).toBe(true)
    const userClassificar = {
      id: 9,
      permissoes: ['tarefa.classificar'],
    } as never
    expect(usuarioPodeClassificarTarefa(userClassificar, tarefa())).toBe(true)
    const userColaborador = { id: 2, permissoes: [] } as never
    expect(usuarioPodeClassificarTarefa(userColaborador, tarefa())).toBe(true)
    const userOutro = { id: 99, permissoes: [] } as never
    expect(usuarioPodeClassificarTarefa(userOutro, tarefa())).toBe(false)
  })

  it('tarefaFormToPayloadNovaTarefa limpa vínculos conforme tipo_etapa', () => {
    const proposta = tarefaFormToPayloadNovaTarefa(
      { ...formBase, tipo_etapa: 'PROPOSTA' },
      'c-pend'
    )
    expect(proposta.coluna).toBe('c-pend')
    expect(proposta.proposta_referencia).toBe('ORC-99')
    expect(proposta.ordem_producao_referencia).toBe('')

    const interna = tarefaFormToPayloadNovaTarefa(
      { ...formBase, tipo_etapa: 'INTERNA' },
      'c-pend'
    )
    expect(interna.proposta_referencia).toBe('')
    expect(interna.ordem_producao_referencia).toBe('')
  })

  it('tarefaPayloadSemClassificacao remove campos de classificação', () => {
    const full = tarefaFormToPayloadNovaTarefa(formBase, 'c-1')
    const restante = tarefaPayloadSemClassificacao(full)
    expect(restante.tipo_etapa).toBeUndefined()
    expect(restante.proposta_referencia).toBeUndefined()
    expect(restante.titulo).toBe('Nova')
  })

  it('toggleColaborador adiciona e remove ids', () => {
    expect(toggleColaborador(['1'], '2')).toEqual(['1', '2'])
    expect(toggleColaborador(['1', '2'], '2')).toEqual(['1'])
  })
})
