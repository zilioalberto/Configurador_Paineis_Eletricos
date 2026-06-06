/** Chaves do React Query para cache e invalidação de dados de projetos. */
export const projetoQueryKeys = {
  all: ['projetos'] as const,
  list: () => [...projetoQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...projetoQueryKeys.all, 'detail', id] as const,
  historico: (id: string) => [...projetoQueryKeys.all, 'historico', id] as const,
}
