export const projetoQueryKeys = {
  all: ['projetos'] as const,
  list: () => [...projetoQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...projetoQueryKeys.all, 'detail', id] as const,
}
