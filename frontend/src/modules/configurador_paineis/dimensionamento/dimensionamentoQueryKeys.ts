/** Chaves do React Query para cache de dimensionamento por projeto. */
export const dimensionamentoQueryKeys = {
  all: ['dimensionamento'] as const,
  porProjeto: (projetoId: string) =>
    [...dimensionamentoQueryKeys.all, 'projeto', projetoId] as const,
}
