export type LinhaEditavelOrcamento = {
  id?: string
  ordem: number
  tipo: 'PRODUTO' | 'SERVICO'
  editavel?: boolean
  origem?: string
  produtoId?: string
  produtoCodigo?: string
  produtoNcm?: string
  descricao: string
  quantidade: string
  custo_unitario: string
  margem_percentual: string
  /** Valor mínimo permitido (não pode reduzir abaixo). */
  margem_minima?: string
  preco_unitario: string
  /** Somente leitura — referência do catálogo fiscal. */
  aliquota_ipi?: string | null
}
