/** Rotas do módulo fiscal (NF-e recebidas, itens, NSU). */
export const fiscalPaths = {
  home: '/fiscal',
  itensFiscais: '/fiscal/itens-fiscais',
  nfes: '/fiscal/nfes',
  relatorioNfes: '/fiscal/relatorios/nfes',
  relatorioFaturamento: '/fiscal/relatorios/faturamento',
  nfesEmitidas: '/fiscal/nfes-emitidas',
  nfeEmitidaDetalhe: (id: number | string) => `/fiscal/nfes-emitidas/${id}`,
  nfeEmitidaImportar: '/fiscal/nfes-emitidas/importar',
  projecaoDas: '/fiscal/simples/projecao-das',
  nfeDetalhe: (id: number | string) => `/fiscal/nfes/${id}`,
  nfeImportarManual: '/fiscal/nfes/importar',
  nsu: '/fiscal/nsu',
} as const
