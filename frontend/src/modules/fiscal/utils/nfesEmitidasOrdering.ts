/** Ordenação padrão da listagem (mais recentes primeiro). */
export const DEFAULT_NFES_EMITIDAS_ORDERING = '-data_emissao'

export type NfesEmitidasOrdenacaoCampo = 'serie' | 'data_emissao' | 'nome_destinatario'

export function proximaOrdenacaoEmitidas(
  campo: NfesEmitidasOrdenacaoCampo,
  ordenacaoAtual: string,
): string {
  if (ordenacaoAtual === campo) return `-${campo}`
  if (ordenacaoAtual === `-${campo}`) {
    if (`-${campo}` === DEFAULT_NFES_EMITIDAS_ORDERING) return campo
    return DEFAULT_NFES_EMITIDAS_ORDERING
  }
  return campo
}

export function ariaSortEmitidas(
  campo: NfesEmitidasOrdenacaoCampo,
  ordenacaoAtual: string,
): 'ascending' | 'descending' | 'none' {
  if (ordenacaoAtual === campo) return 'ascending'
  if (ordenacaoAtual === `-${campo}`) return 'descending'
  return 'none'
}
