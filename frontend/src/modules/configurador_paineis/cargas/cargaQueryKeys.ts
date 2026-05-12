export const cargaQueryKeys = {
  all: ['cargas'] as const,
  list: (projetoId: string | null) =>
    [...cargaQueryKeys.all, 'list', projetoId] as const,
  detail: (id: string) => [...cargaQueryKeys.all, 'detail', id] as const,
}
