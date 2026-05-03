export const catalogoQueryKeys = {
  all: ['catalogo'] as const,
  plcFamilias: (apenasEspecificacaoPlc?: boolean) =>
    [...catalogoQueryKeys.all, 'plc-familias', Boolean(apenasEspecificacaoPlc)] as const,
  categorias: () => [...catalogoQueryKeys.all, 'categorias'] as const,
  produtos: (categoriaId?: string | null, page = 1, pageSize = 50) =>
    [...catalogoQueryKeys.all, 'produtos', categoriaId ?? 'all', page, pageSize] as const,
  produto: (id: string) => [...catalogoQueryKeys.all, 'produto', id] as const,
}
