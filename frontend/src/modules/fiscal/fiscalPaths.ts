/** Rotas do módulo fiscal (NF-e recebidas, itens, NSU). */
export const fiscalPaths = {
  home: '/fiscal',
  itensFiscais: '/fiscal/itens-fiscais',
  nfes: '/fiscal/nfes',
  relatorioNfes: '/fiscal/relatorios/nfes',
  nfeEmitidaImportar: '/fiscal/nfes-emitidas/importar',
  nfeDetalhe: (id: number | string) => `/fiscal/nfes/${id}`,
  nfeImportarManual: '/fiscal/nfes/importar',
  nsu: '/fiscal/nsu',
} as const
