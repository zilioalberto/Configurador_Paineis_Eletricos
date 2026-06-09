/**
 * Tipos TypeScript para dimensionamento: resumo, circuitos de condutores
 * e payload de revisão/aprovação de bitolas.
 */

/** Resposta GET/PATCH `/configurador/dimensionamento/projeto/:id/` (detalhe com condutores). */
export type TabelaReferenciaCondutor = {
  secao_mm2: string
  iz_a: string
}

export type CircuitoCargaCondutores = {
  id: string
  carga: string
  carga_tag: string
  tipo_carga: string
  classificacao_circuito: string
  corrente_calculada_a: string | null
  corrente_projeto_a: string | null
  corrente_referencia_a: string | null
  possui_neutro: boolean
  possui_pe: boolean
  secao_condutor_fase_mm2: string | null
  secao_condutor_neutro_mm2: string | null
  secao_condutor_pe_mm2: string | null
  secao_condutor_fase_escolhida_mm2: string | null
  secao_condutor_neutro_escolhida_mm2: string | null
  secao_condutor_pe_escolhida_mm2: string | null
  secao_condutor_fase_efetiva_mm2: string | null
  secao_condutor_neutro_efetiva_mm2: string | null
  secao_condutor_pe_efetiva_mm2: string | null
  /** Gravado no servidor: linha na tabela de aprovados. */
  condutores_aprovado?: boolean
}

export type AlimentacaoGeralCondutores = {
  id: string
  corrente_total_painel_a: string
  tipo_corrente: string
  numero_fases: number | null
  possui_neutro: boolean
  possui_terra: boolean
  secao_condutor_fase_mm2: string | null
  secao_condutor_neutro_mm2: string | null
  secao_condutor_pe_mm2: string | null
  secao_condutor_fase_escolhida_mm2: string | null
  secao_condutor_neutro_escolhida_mm2: string | null
  secao_condutor_pe_escolhida_mm2: string | null
  secao_condutor_fase_efetiva_mm2: string | null
  secao_condutor_neutro_efetiva_mm2: string | null
  secao_condutor_pe_efetiva_mm2: string | null
  condutores_aprovado?: boolean
}

export type ResumoDimensionamento = {
  id: string
  projeto: string
  projeto_codigo?: string
  projeto_nome?: string
  criado_em?: string
  atualizado_em?: string
  corrente_total_painel_a: string
  /** Corrente acumulada por fase do painel (sem fator de demanda). */
  correntes_por_fase_painel_a?: string[]
  /** True quando o FD do projeto entra no seccionamento de entrada. */
  aplica_fator_demanda_seccionamento?: boolean
  tipo_painel?: string
  tipo_painel_display?: string
  corrente_estimada_fonte_24vcc_a?: string
  necessita_fonte_24vcc?: boolean
  necessita_plc?: boolean
  necessita_expansao_plc?: boolean
  total_entradas_digitais?: number
  total_saidas_digitais?: number
  total_entradas_analogicas?: number
  total_saidas_analogicas?: number
  possui_seccionamento?: boolean
  tipo_seccionamento?: string | null
  tipo_seccionamento_display?: string
  observacoes?: string
  condutores_revisao_confirmada?: boolean
  detalhe_dimensionamento_mecanico?: DimensionamentoMecanicoDetalhe
  /** Presente no detalhe completo (GET dimensionamento). */
  circuitos_carga?: CircuitoCargaCondutores[]
  alimentacao_geral?: AlimentacaoGeralCondutores | null
  secoes_comerciais_mm2?: string[]
  condutores_tabela_referencia?: TabelaReferenciaCondutor[]
}

export type DimensionamentoMecanicoItem = {
  composicao_item_id: string
  produto_id?: string
  produto_codigo: string
  produto_descricao: string
  fabricante?: string
  referencia_fabricante?: string
  quantidade: string
  largura_mm?: string
  altura_mm?: string
  profundidade_mm?: string | null
  area_frontal_mm2?: string
  modo_montagem?: string
  parte_painel: string
  categoria_produto: string
  secao_max_mm2?: string
  eh_borne_alimentacao?: boolean
  carga_tag?: string | null
  carga_descricao?: string | null
  parte_painel_display?: string | null
  origem_item?: 'composicao' | 'sugestao' | 'reserva_pendencia' | 'inclusao_manual'
  reserva_mecanica?: boolean
}

export type PainelSugerido = {
  produto_id: string
  produto_codigo: string
  produto_descricao: string
  placa_largura_util_mm: string
  placa_altura_util_mm: string
  profundidade_mm?: string | null
  tipo_painel: string
  grau_protecao_ip: string
}

export type CanaletaCatalogo = {
  produto_id: string
  produto_codigo: string
  produto_descricao: string
  largura_base_mm: string
  altura_mm: string
  comprimento_mm?: string | null
  modo_montagem?: string
}

export type ZonaUtilComponentesDetalhe = {
  largura_placa_referencia_mm: number
  altura_placa_referencia_mm: number
  largura_zona_componentes_mm: number
  altura_zona_componentes_mm: number
  area_zona_componentes_mm2: string
  ocupacao_canaletas_largura_mm: number
  ocupacao_canaletas_altura_mm: number
}

export type ValidacaoZonaUtilDetalhe = {
  ok: boolean
  alertas: string[]
  area_minima_necessaria_mm2: string
  taxa_ocupacao_zona_percentual: string
}

export type CanaletaLayoutItem = {
  orientacao: 'vertical' | 'horizontal'
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  comprimento_mm: number
  fixa_extremidade?: 'superior' | 'inferior' | null
  arrastavel?: boolean
  indice_faixa?: number
}

export type TrilhoDinLayoutItem = {
  orientacao: 'trilho_din'
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  comprimento_mm: number
}

export type ComponenteDisposicaoItem = {
  instancia_id: string
  composicao_item_id: string
  produto_codigo: string
  produto_descricao: string
  modo_montagem: string
  x_mm: number
  y_mm: number
  largura_mm: number
  altura_mm: number
  trilho_indice: number | null
  manual: boolean
}

export type LayoutPlacaDetalhe = {
  placa_largura_mm: number
  placa_altura_mm: number
  largura_base_mm: number
  trilho_din_altura_perfil_mm?: number
  canaleta_altura_perfil_mm?: number
  comprimento_canaleta_vertical_mm: number
  comprimento_canaleta_horizontal_mm: number
  canaletas_verticais: CanaletaLayoutItem[]
  canaletas_horizontais: CanaletaLayoutItem[]
  trilhos_din?: TrilhoDinLayoutItem[]
  canaletas_horizontais_intermediarias_y_mm?: number[]
  zona_componentes: {
    x_mm: number
    y_mm: number
    largura_mm: number
    altura_mm: number
  }
}

export type DimensionamentoMecanicoDetalhe = {
  taxa_ocupacao_max_configurada_percentual: string
  area_componentes_mm2: string
  area_zona_util_min_mm2: string
  largura_zona_util_mm: number
  altura_zona_util_mm: number
  largura_placa_min_mm: number
  altura_placa_min_mm: number
  profundidade_min_mm: number
  taxa_ocupacao_calculada_percentual: string
  canaleta?: CanaletaCatalogo | null
  canaleta_escolhida?: CanaletaCatalogo | null
  canaletas_catalogo?: CanaletaCatalogo[]
  canaletas_verticais_sugeridas?: number
  faixas_horizontais_sugeridas?: number
  canaletas_verticais: number
  faixas_horizontais: number
  espacamento_max_horizontal_mm?: number
  altura_referencia_canaletas_mm?: number
  folga_profundidade_mm: number
  margem_placa_mm: number
  itens_considerados: DimensionamentoMecanicoItem[]
  itens_sem_dimensao: DimensionamentoMecanicoItem[]
  paineis_sugeridos: PainelSugerido[]
  painel_escolhido?: PainelSugerido | null
  zona_util_componentes?: ZonaUtilComponentesDetalhe
  validacao_zona_util?: ValidacaoZonaUtilDetalhe
  layout_placa?: LayoutPlacaDetalhe
  canaletas_horizontais_intermediarias_y_mm?: number[]
  disposicao_componentes?: ComponenteDisposicaoItem[]
  memoria_calculo: string
}

export type PatchDimensionamentoMecanicoPayload = {
  painel_produto_id?: string | null
  canaleta_produto_id?: string | null
  canaletas_verticais?: number
  faixas_horizontais?: number
  taxa_ocupacao_max_percentual?: number | string
  disposicao_componentes?: ComponenteDisposicaoItem[]
  canaletas_horizontais_intermediarias_y_mm?: number[]
}

export type PatchCondutoresPayload = {
  circuitos?: Array<{
    id: string
    secao_condutor_fase_escolhida_mm2?: string | null
    secao_condutor_neutro_escolhida_mm2?: string | null
    secao_condutor_pe_escolhida_mm2?: string | null
    condutores_aprovado?: boolean
  }>
  alimentacao_geral?: {
    secao_condutor_fase_escolhida_mm2?: string | null
    secao_condutor_neutro_escolhida_mm2?: string | null
    secao_condutor_pe_escolhida_mm2?: string | null
    condutores_aprovado?: boolean
  }
  confirmar_revisao?: boolean
}
