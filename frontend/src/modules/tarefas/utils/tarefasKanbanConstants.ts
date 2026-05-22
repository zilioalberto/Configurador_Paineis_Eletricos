import type { ColunaKanban, PrioridadeTarefa, TarefaKanbanItem, TipoTarefa } from '../types/tarefa'

export type FiltroSituacao = 'todas' | 'abertas' | 'vencidas' | 'concluidas'

export type VisualizacaoTarefas = 'kanban' | 'lista' | 'calendario' | 'dashboard'

export type ColunaRenderizada = ColunaKanban & {
  tarefasVisiveis: TarefaKanbanItem[]
}

export type TarefaVisivel = TarefaKanbanItem & {
  colunaNome: string
  colunaStatus: string
}

export type TarefaFormState = {
  titulo: string
  descricao: string
  coluna: string
  responsavel: string
  colaboradores: string[]
  prioridade: PrioridadeTarefa
  prazo: string
  tipo_etapa: TipoTarefa
  proposta_referencia: string
  ordem_producao_referencia: string
  horas_estipuladas: string
}

export const TIPOS_ETAPA_OPTIONS: Array<{ value: TipoTarefa; label: string }> = [
  { value: 'NAO_CLASSIFICADA', label: 'Não classificada' },
  { value: 'PROPOSTA', label: 'Proposta (orçamento)' },
  { value: 'PRODUCAO', label: 'Produção (OP)' },
  { value: 'INTERNA', label: 'Interna' },
]

export const DEFAULT_FORM_STATE: TarefaFormState = {
  titulo: '',
  descricao: '',
  coluna: '',
  responsavel: '',
  colaboradores: [],
  prioridade: 'MEDIA',
  prazo: '',
  tipo_etapa: 'NAO_CLASSIFICADA',
  proposta_referencia: '',
  ordem_producao_referencia: '',
  horas_estipuladas: '',
}

export const FILTROS_SITUACAO: Array<[FiltroSituacao, string]> = [
  ['todas', 'Mostrar todas'],
  ['abertas', 'Abertas'],
  ['vencidas', 'Vencidas'],
  ['concluidas', 'Concluídas'],
]

export const VISUALIZACOES_TAREFAS: Array<[VisualizacaoTarefas, string]> = [
  ['kanban', 'Kanban'],
  ['lista', 'Lista'],
  ['calendario', 'Calendário'],
  ['dashboard', 'Dashboard'],
]
