/** Rótulo legível da origem de uma linha de orçamento. */
export function rotuloOrigemLinhaOrcamento(origem?: string | null): string {
  switch (origem) {
    case 'CONFIGURADOR':
      return 'Configurador'
    case 'CATALOGO':
      return 'Catálogo'
    case 'HERANCA_REVISAO':
      return 'Revisão'
    case 'MANUAL':
      return 'Manual'
    default:
      return '—'
  }
}

/** NCM do produto na listagem do catálogo (autocomplete). */
export function ncmProdutoCatalogo(produto: {
  informacao_comercial?: { ncm?: string } | null
}): string | undefined {
  const ncm = produto.informacao_comercial?.ncm?.trim()
  return ncm || undefined
}

/** Exibe NCM na tabela; serviços não usam NCM. */
export function exibirNcmLinhaOrcamento(
  tipo: 'PRODUTO' | 'SERVICO',
  ncm?: string | null
): string {
  if (tipo === 'SERVICO') return '—'
  const valor = ncm?.trim()
  return valor || '—'
}
