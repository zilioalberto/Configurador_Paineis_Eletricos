export const fiscalQueryKeys = {
  all: ['fiscal'] as const,
  itensFiscais: (search: string, page: number, pageSize: number) =>
    ['fiscal', 'itens-fiscais', search.trim(), page, pageSize] as const,
  produtoBuscaFiscal: (consulta: string) =>
    [...fiscalQueryKeys.all, 'produto-busca-fiscal', consulta.trim()] as const,
}
