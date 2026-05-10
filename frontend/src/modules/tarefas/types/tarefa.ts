export type StatusTarefa =
  | 'PENDENTE'
  | 'INICIADA'
  | 'ABERTA'
  | 'EM_ANDAMENTO'
  | 'BLOQUEADA'
  | 'CONCLUIDA'
  | 'CANCELADA'

export type TipoTarefa = 'NAO_CLASSIFICADA' | 'PROPOSTA' | 'PRODUCAO' | 'INTERNA'

export type PrioridadeTarefa = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'

export type TarefaKanbanItem = {
  id: string
  titulo: string
  descricao: string
  coluna: string
  responsavel: number | null
  responsavel_nome: string | null
  criador?: number | null
  criador_nome?: string | null
  colaboradores: number[]
  colaboradores_nomes: string[]
  prioridade: PrioridadeTarefa
  prioridade_display: string
  prazo: string | null
  status: StatusTarefa
  status_display: string
  tipo_etapa?: TipoTarefa
  tipo_etapa_display?: string
  referencia_vinculo?: string
  pode_iniciar?: boolean
  pode_receber_apontamento?: boolean
  /** Gestor (ver todas / gerir quadro): só true se a tarefa ainda não foi iniciada (API). */
  pode_excluir?: boolean
  proposta_referencia: string
  ordem_producao_referencia: string
  horas_estipuladas?: string | null
  ordem: number
  concluida_em: string | null
  total_horas_apontadas: string
}

export type ColunaKanban = {
  id: string
  quadro: string
  nome: string
  ordem: number
  status_semantico: string
  status_semantico_display: string
  limite_wip: number | null
  tarefas: TarefaKanbanItem[]
}

export type QuadroKanban = {
  id: string
  nome: string
  descricao: string
  equipe: string
  ativo: boolean
  total_tarefas: number
  colunas: ColunaKanban[]
}

export type KanbanTarefasResponse = {
  quadro: QuadroKanban | null
}

export type TarefaResponsavelOption = {
  id: number
  label: string
  email: string
  tipo_usuario: string
}

/** Resposta de GET .../horas-gestao/colaboradores/ (sem tipo_usuario). */
export type ColaboradorHorasGestaoOption = {
  id: number
  label: string
  email: string
}

export type CriarTarefaPayload = {
  titulo: string
  descricao?: string
  coluna: string
  responsavel?: number | null
  colaboradores?: number[]
  prioridade: PrioridadeTarefa
  prazo?: string | null
  tipo_etapa?: TipoTarefa
  proposta_referencia?: string
  ordem_producao_referencia?: string
  horas_estipuladas?: string | null
}

/** Corpo do endpoint POST /tarefas/:id/classificar/ (opcional; também é aceito no PATCH). */
export type ClassificarTarefaPayload = {
  tipo_etapa: TipoTarefa
  proposta_referencia?: string
  ordem_producao_referencia?: string
  horas_estipuladas?: string | null
}

export type AtualizarTarefaPayload = Partial<CriarTarefaPayload>

export type MoverTarefaPayload = {
  tarefaId: string
  colunaId: string
  ordem?: number
}

export type RegistrarApontamentoHoraPayload = {
  tarefa: string
  data: string
  horas: string
  etapa?: string
  observacoes?: string
}

export type ApontamentoHora = {
  id: string
  criado_em: string
  atualizado_em: string
  tarefa: string
  colaborador: number
  colaborador_nome: string | null
  data: string
  horas: string
  hora_inicio?: string | null
  hora_fim?: string | null
  horas_calculadas?: string
  etapa: string
  observacoes: string
  origem?: string
  status_aprovacao: string
  valor_hora_snapshot?: string
  custo_total?: string
  justificativa_ajuste?: string
  aprovado_por: number | null
  aprovado_por_nome: string | null
  aprovado_em: string | null
  sessao_id: string | null
  sessao_iniciado_em: string | null
  sessao_finalizado_em: string | null
}

export type SessaoTrabalhoTarefa = {
  id: string
  tarefa: string
  tarefa_titulo: string
  colaborador: number
  colaborador_nome: string | null
  iniciado_em: string
  finalizado_em: string | null
  etapa: string
  observacoes: string
  origem?: string
  motivo_encerramento?: string
  apontamento: string | null
  duracao_segundos: number
}

export type TarefaTimerAtivoResponse = {
  sessao: SessaoTrabalhoTarefa | null
}

export type TarefaTimerPararResponse = {
  sessao: SessaoTrabalhoTarefa
  apontamento: ApontamentoHora
}

export type TarefaDashboardHorasDia = {
  data: string
  colaborador: number
  colaborador_nome: string
  total_horas: string
  total_apontamentos: number
  total_tarefas: number
  apontamentos: ApontamentoHora[]
}

export type RelatorioHorasGestaoColaborador = {
  colaborador_id: number
  colaborador_nome: string
  total_horas: string
  registros: number
}

export type RelatorioHorasGestaoTarefa = {
  tarefa_id: string
  titulo: string
  tipo_etapa: string
  proposta_referencia: string
  ordem_producao_referencia: string
  total_horas: string
  registros: number
  colaboradores_distintos: number
}

export type RelatorioHorasGestaoDetalhe = {
  tarefa_id: string
  titulo: string
  colaborador_id: number
  colaborador_nome: string
  horas: string
  registros: number
}

export type RelatorioHorasGestaoPorProposta = {
  proposta_referencia: string
  total_horas: string
  registros: number
  tarefas_distintas: number
  colaboradores_distintos: number
}

export type RelatorioHorasGestaoPorOrdemProducao = {
  ordem_producao_referencia: string
  total_horas: string
  registros: number
  tarefas_distintas: number
  colaboradores_distintos: number
}

export type RelatorioHorasGestao = {
  periodo: { data_inicio: string; data_fim: string }
  filtros: {
    proposta: string | null
    ordem_producao: string | null
    colaborador_id: number | null
    colaborador_nome: string | null
  }
  total_horas: string
  por_colaborador: RelatorioHorasGestaoColaborador[]
  por_proposta: RelatorioHorasGestaoPorProposta[]
  por_ordem_producao: RelatorioHorasGestaoPorOrdemProducao[]
  por_tarefa: RelatorioHorasGestaoTarefa[]
  por_tarefa_colaborador: RelatorioHorasGestaoDetalhe[]
}

export type ComentarioTarefa = {
  id: string
  tarefa: string
  autor: number | null
  autor_nome: string | null
  comentario: string
  criado_em: string
  atualizado_em: string
}

export type ChecklistTarefaItem = {
  id: string
  tarefa: string
  titulo: string
  concluido: boolean
  concluido_por: number | null
  concluido_por_nome: string | null
  concluido_em: string | null
  ordem: number
  criado_em: string
  atualizado_em: string
}

export type HistoricoTarefaItem = {
  id: string
  tarefa: string
  usuario: number | null
  usuario_nome: string | null
  tipo: string
  tipo_display: string
  descricao: string
  dados: Record<string, unknown>
  coluna_origem: string | null
  coluna_destino: string | null
  responsavel_anterior: number | null
  responsavel_novo: number | null
  prazo_anterior: string | null
  prazo_novo: string | null
  criado_em: string
  atualizado_em: string
}

export type AjustarApontamentoPayload = {
  justificativa_ajuste: string
  data?: string
  horas?: string
  hora_inicio?: string | null
  hora_fim?: string | null
  etapa?: string
  observacoes?: string
}
