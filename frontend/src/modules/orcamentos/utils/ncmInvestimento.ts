/** NCM padrão na oferta — painéis elétricos (perfil solução completa). */
export const NCM_INVESTIMENTO_PAINEL_PADRAO = '85371090'

export function normalizarNcmInvestimento(valor: string | null | undefined): string {
  const digitos = (valor ?? '').replace(/\D/g, '')
  return digitos || NCM_INVESTIMENTO_PAINEL_PADRAO
}

export function formatarNcmInvestimentoInput(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8)
}
