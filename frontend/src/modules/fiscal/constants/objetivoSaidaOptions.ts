import type { ObjetivoSaidaFiscal, TipoDocumentoFiscalEmitido } from '../types/documentoFiscalRecebido'

export const objetivoSaidaOptions: ReadonlyArray<{ value: ObjetivoSaidaFiscal; label: string }> = [
  { value: 'VENDA_PRODUTO', label: 'Venda de produto' },
  { value: 'PRESTACAO_SERVICO', label: 'Prestação de serviço' },
  { value: 'INDUSTRIALIZACAO', label: 'Industrialização' },
  { value: 'DEVOLUCAO_COMPRA', label: 'Devolução de compra' },
  { value: 'REMESSA', label: 'Remessa' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BONIFICACAO_DOACAO_BRINDE', label: 'Bonificação, doação ou brinde' },
  { value: 'OUTRAS_SAIDAS', label: 'Outras saídas' },
]

export function labelObjetivoSaida(value: ObjetivoSaidaFiscal | string): string {
  return objetivoSaidaOptions.find((option) => option.value === value)?.label ?? value
}

export function labelTipoDocumentoEmitido(value: TipoDocumentoFiscalEmitido | string): string {
  const map: Record<TipoDocumentoFiscalEmitido, string> = {
    NFE_PRODUTO: 'NF-e de produto',
    NFSE_SERVICO: 'NFS-e de serviço',
  }
  return map[value as TipoDocumentoFiscalEmitido] ?? value
}
