import type { ObjetivoEntradaFiscal } from '../types/documentoFiscalRecebido'

export const objetivoEntradaOptions: Array<{
  value: ObjetivoEntradaFiscal
  label: string
}> = [
  { value: 'INDUSTRIALIZACAO', label: 'Industrialização' },
  { value: 'REVENDA', label: 'Revenda' },
  { value: 'USO_CONSUMO', label: 'Uso e consumo' },
  { value: 'ATIVO_IMOBILIZADO', label: 'Ativo imobilizado' },
  { value: 'DEVOLUCAO_VENDA', label: 'Devolução de venda' },
  { value: 'RETORNO_INDUSTRIALIZACAO', label: 'Retorno de industrialização' },
  { value: 'RETORNO_CONSERTO_REPARO', label: 'Retorno de conserto/reparo' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BONIFICACAO_DOACAO_BRINDE', label: 'Bonificação, doação ou brinde' },
  { value: 'AMOSTRA_GRATIS', label: 'Amostra grátis' },
  { value: 'COMODATO_EMPRESTIMO', label: 'Comodato/empréstimo' },
  { value: 'DEMONSTRACAO', label: 'Demonstração' },
  { value: 'IMPORTACAO', label: 'Importação' },
  { value: 'OUTRAS_ENTRADAS', label: 'Outras entradas' },
]

export function labelObjetivoEntrada(value: ObjetivoEntradaFiscal | '' | null | undefined): string {
  if (!value) return 'Não informado'
  return objetivoEntradaOptions.find((option) => option.value === value)?.label ?? value
}
