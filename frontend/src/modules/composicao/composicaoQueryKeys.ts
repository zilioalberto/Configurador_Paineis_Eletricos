export const composicaoQueryKeys = {
  all: ['composicao'] as const,
  snapshot: (projetoId: string) =>
    [...composicaoQueryKeys.all, 'snapshot', projetoId] as const,
  alternativas: (sugestaoId: string) =>
    [...composicaoQueryKeys.all, 'alternativas', sugestaoId] as const,
}
