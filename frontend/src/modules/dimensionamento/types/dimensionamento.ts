/** Resposta GET `/dimensionamento/projeto/:id/` */
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
}
