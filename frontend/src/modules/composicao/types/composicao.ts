export type ProdutoMini = {
  id: string
  codigo: string
  descricao: string
  fabricante?: string
}

export type ProdutoAlternativa = ProdutoMini & {
  valor_unitario?: string
}

export type CargaDetalhe = {
  id: string
  tag: string
  tipo?: string
  tipo_display?: string
  corrente_a?: string | null
}

export type ProjetoAlimentacaoSnapshot = {
  tensao_nominal: number
  tensao_nominal_display: string
  tipo_corrente: string
  tipo_corrente_display: string
}

export type SugestaoItem = {
  id: string
  parte_painel: string
  parte_painel_display?: string
  categoria_produto: string
  categoria_produto_display?: string
  quantidade: string
  corrente_referencia_a?: string | null
  status: string
  status_display?: string
  memoria_calculo?: string
  observacoes?: string
  ordem: number
  produto?: ProdutoMini | null
  produto_codigo?: string | null
  carga: CargaDetalhe | null
  projeto_alimentacao?: ProjetoAlimentacaoSnapshot
  criado_em?: string
  atualizado_em?: string
}

export type ComposicaoItem = {
  id: string
  parte_painel: string
  parte_painel_display?: string
  categoria_produto: string
  categoria_produto_display?: string
  quantidade: string
  corrente_referencia_a?: string | null
  memoria_calculo?: string
  observacoes?: string
  ordem: number
  produto?: ProdutoMini | null
  produto_codigo?: string | null
  carga: CargaDetalhe | null
  projeto_alimentacao?: ProjetoAlimentacaoSnapshot
  criado_em?: string
  atualizado_em?: string
}

export type PendenciaItem = {
  id: string
  parte_painel: string
  parte_painel_display?: string
  categoria_produto: string
  categoria_produto_display?: string
  corrente_referencia_a?: string | null
  descricao: string
  memoria_calculo?: string
  observacoes?: string
  status: string
  status_display?: string
  ordem: number
  carga: { id: string; tag: string } | null
  criado_em?: string
  atualizado_em?: string
}

export type ComposicaoSnapshot = {
  projeto: string
  projeto_codigo?: string
  projeto_nome?: string
  sugestoes: SugestaoItem[]
  pendencias: PendenciaItem[]
  composicao_itens?: ComposicaoItem[]
  totais: {
    sugestoes: number
    pendencias: number
    composicao_itens?: number
  }
  geracao?: {
    total_sugestoes_retornadas: number
    erros_etapas: { etapa: string; erro: string }[]
  }
}

export type AprovarSugestaoResponse = {
  composicao_item: ComposicaoItem
  snapshot: ComposicaoSnapshot
}
