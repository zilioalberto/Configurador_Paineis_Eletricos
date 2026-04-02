export const dimensionamentoQueryKeys = {
  all: ['dimensionamento'] as const,
  porProjeto: (projetoId: string) =>
    [...dimensionamentoQueryKeys.all, 'projeto', projetoId] as const,
}
