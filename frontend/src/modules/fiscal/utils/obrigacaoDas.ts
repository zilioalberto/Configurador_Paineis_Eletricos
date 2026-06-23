import type { ObrigacaoFiscalDto } from '../services/fiscalObrigacoesService'

/** DAS cujo valor e composição foram extraídos com sucesso do PDF Simples Nacional. */
export function obrigacaoDasDoPdf(obrigacao: ObrigacaoFiscalDto): boolean {
  if (obrigacao.tipo !== 'DAS') {
    return false
  }
  return (obrigacao.dados_extra?.fonte_valor as string | undefined) === 'pdf_simples_nacional'
}
