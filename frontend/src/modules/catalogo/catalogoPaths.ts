/** Rotas canónicas do módulo catálogo (produtos e serviços). */

export const catalogoPaths = {
  raiz: '/catalogo',
  produtos: '/catalogo/produtos',
  produtoNovo: '/catalogo/produtos/novo',
  produtoImportarNfe: '/catalogo/produtos/importar-nfe',
  produtoDetalhe: (id: string) => `/catalogo/produtos/${id}`,
  produtoEditar: (id: string) => `/catalogo/produtos/${id}/editar`,
  servicos: '/catalogo/servicos',
  servicoNovo: '/catalogo/servicos/novo',
  servicoEditar: (id: string) => `/catalogo/servicos/${id}/editar`,
} as const
