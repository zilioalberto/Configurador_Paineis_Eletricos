export type LinhaEditavelOrcamento = {
  id?: string
  ordem: number
  tipo: 'PRODUTO' | 'SERVICO'
  editavel?: boolean
  origem?: string
  painelRef?: string
  produtoId?: string
  produtoIdOriginal?: string
  produtoCodigo?: string
  produtoNcm?: string
  servicoId?: string
  servicoIdOriginal?: string
  servicoCodigo?: string
  servicoUnidadeMedida?: string
  servicoCategoria?: string
  catalogoPrecoAtualizadoEm?: string | null
  catalogoPrecoDesatualizado?: boolean
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
