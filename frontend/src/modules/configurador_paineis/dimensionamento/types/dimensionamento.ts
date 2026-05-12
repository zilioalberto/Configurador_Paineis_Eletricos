/** Resposta GET/PATCH `/dimensionamento/projeto/:id/` (detalhe com condutores). */
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
  /** Presente no detalhe completo (GET dimensionamento). */
  circuitos_carga?: CircuitoCargaCondutores[]
  alimentacao_geral?: AlimentacaoGeralCondutores | null
  secoes_comerciais_mm2?: string[]
  condutores_tabela_referencia?: TabelaReferenciaCondutor[]
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
