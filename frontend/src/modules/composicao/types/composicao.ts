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
  descricao?: string
  tipo?: string
  tipo_display?: string
  quantidade?: number
  potencia_corrente_valor?: string | number | null
  potencia_corrente_unidade?: string | null
  potencia_corrente_unidade_display?: string | null
  corrente_a?: string | null
  /** Tensão nominal da carga (ex.: motor, resistência), não a do projeto. */
  tensao_carga_v?: number | null
  tensao_carga_display?: string | null
  numero_fases_carga?: number | null
  numero_fases_carga_display?: string | null
}

export type ProjetoAlimentacaoSnapshot = {
  tensao_nominal: number
  tensao_nominal_display: string
  tipo_corrente: string
  tipo_corrente_display: string
  /** Valor do campo `projetos_projeto.numero_fases` */
  numero_fases?: number | null
  numero_fases_display?: string
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
  indice_escopo?: number
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
  indice_escopo?: number
  produto?: ProdutoMini | null
  produto_codigo?: string | null
  carga: CargaDetalhe | null
  projeto_alimentacao?: ProjetoAlimentacaoSnapshot
  status_display?: string
  criado_em?: string
  atualizado_em?: string
}

/** Produto do catálogo incluído manualmente na composição (fora das sugestões automáticas). */
export type InclusaoManualItem = {
  id: string
  quantidade: string
  observacoes?: string
  ordem: number
  produto: ProdutoMini
  categoria_produto: string
  categoria_produto_display?: string
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
  indice_escopo?: number
  carga: CargaDetalhe | null
  projeto_alimentacao?: ProjetoAlimentacaoSnapshot
  criado_em?: string
  atualizado_em?: string
}

/** Resposta de POST reavaliar-pendencias (mesmo payload do snapshot + metadados). */
export type ReavaliacaoPendenciasPayload = {
  projeto_id: string
  pendencias_analisadas?: number
  categorias_encontradas: string[]
  categorias_reavaliadas: string[]
  escopos_reprocessados?: string[]
  categorias_nao_mapeadas: string[]
  erros: { categoria_produto: string; erro: string }[]
  pendencias_abertas_antes: number
  pendencias_abertas_depois: number
}

export type ComposicaoSnapshot = {
  projeto: string
  projeto_codigo?: string
  projeto_nome?: string
  sugestoes: SugestaoItem[]
  pendencias: PendenciaItem[]
  composicao_itens?: ComposicaoItem[]
  inclusoes_manuais?: InclusaoManualItem[]
  totais: {
    sugestoes: number
    pendencias: number
    composicao_itens?: number
    inclusoes_manuais?: number
  }
  geracao?: {
    total_sugestoes_retornadas: number
    erros_etapas: { etapa: string; erro: string }[]
    sugestoes_descartadas_aprovadas?: number
  }
  reavaliacao?: ReavaliacaoPendenciasPayload
}

export type AprovarSugestaoResponse = {
  composicao_item: ComposicaoItem
  snapshot: ComposicaoSnapshot
}
