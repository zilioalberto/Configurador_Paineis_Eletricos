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

/** Título acessível para referência curta do painel (P1 → Painel 1). */
export function tituloPainelRef(ref?: string | null): string {
  const valor = ref?.trim()
  if (!valor) return ''
  const match = /^P(\d+)$/.exec(valor)
  if (match) return `Painel ${match[1]}`
  return valor
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
