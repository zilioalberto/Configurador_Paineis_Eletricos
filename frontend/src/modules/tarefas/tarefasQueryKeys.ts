/** Chaves React Query do módulo tarefas. */
export const tarefasQueryKeys = {
  all: ['tarefas'] as const,
  kanban: (quadroId?: string | null) =>
    quadroId
      ? ([...tarefasQueryKeys.all, 'kanban', quadroId] as const)
      : ([...tarefasQueryKeys.all, 'kanban'] as const),
  responsaveis: () => [...tarefasQueryKeys.all, 'responsaveis'] as const,
  timerAtivo: () => [...tarefasQueryKeys.all, 'timer-ativo'] as const,
  horasDia: (userId: number | string, data: string) =>
    [...tarefasQueryKeys.all, 'horas-dia', userId, data] as const,
  apontamentos: (tarefaId: string) => [...tarefasQueryKeys.all, 'apontamentos', tarefaId] as const,
  historico: (tarefaId: string) => [...tarefasQueryKeys.all, 'historico', tarefaId] as const,
  comentarios: (tarefaId: string) => [...tarefasQueryKeys.all, 'comentarios', tarefaId] as const,
  checklist: (tarefaId: string) => [...tarefasQueryKeys.all, 'checklist', tarefaId] as const,
  relatorioHorasGestao: (params: {
    data_inicio: string
    data_fim: string
    proposta?: string
    ordem_producao?: string
    colaborador?: string
  }) => [...tarefasQueryKeys.all, 'relatorio-horas-gestao', params] as const,
  relatorioHorasGestaoColaboradores: (params: { data_inicio: string; data_fim: string }) =>
    [...tarefasQueryKeys.all, 'relatorio-horas-gestao-colaboradores', params] as const,
}
