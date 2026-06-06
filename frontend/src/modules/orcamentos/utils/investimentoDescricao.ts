export const INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO = 'Demais itens da proposta'

export function descricaoInvestimentoConsolidadaPadrao(titulo: string): string {
  const t = titulo.trim()
  return t
    ? `Solução completa conforme escopo técnico - ${t}`
    : 'Solução completa conforme escopo técnico'
}

/** Texto exibido na tabela de investimento (custom ou padrão). */
export function descricaoInvestimentoExibicao(
  custom: string | null | undefined,
  padrao: string
): string {
  const valor = (custom ?? '').trim()
  return valor || padrao
}

export function placeholderDescricaoInvestimento(titulo: string): string {
  return INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO
}
