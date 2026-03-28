export const catalogoQueryKeys = {
  all: ['catalogo'] as const,
  categorias: () => [...catalogoQueryKeys.all, 'categorias'] as const,
  produtos: (categoriaId?: string | null) =>
    [...catalogoQueryKeys.all, 'produtos', categoriaId ?? 'all'] as const,
  produto: (id: string) => [...catalogoQueryKeys.all, 'produto', id] as const,
}
