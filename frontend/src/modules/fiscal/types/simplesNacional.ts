import type { AnexoSimplesNacional } from './documentoFiscalRecebido'

export type PerfilTributarioSimplesDto = {
  readonly id: number
  readonly cnpj: string
  readonly folha_salarios_12m: string
  readonly encargos_folha_12m: string
  readonly anexo_servicos_override: AnexoSimplesNacional
  readonly criado_em: string
  readonly atualizado_em: string
}

export type FaturamentoMensalRow = {
  readonly competencia: string
  readonly valor_nfes: string
  readonly valor_ajuste: string
  readonly valor_total: string
  readonly quantidade_nfes: number
  readonly observacao_ajuste: string
  readonly por_anexo_bruto: Record<string, string>
}

export type FaturamentoSimplesResponse = {
  readonly cnpj: string
  readonly data_referencia: string
  readonly rbt12_total: string
  readonly meses: FaturamentoMensalRow[]
}

export type ParcelaDasEstimada = {
  readonly anexo: string
  readonly receita_mes: string
  readonly rbt12_anexo: string
  readonly faixa: number
  readonly aliquota_nominal: string
  readonly aliquota_efetiva: string
  readonly das_estimado: string
}

export type ProjecaoDasSimplesResponse = {
  readonly cnpj: string
  readonly competencia: string
  readonly data_referencia_rbt12: string
  readonly rbt12_total: string
  readonly fator_r: string | null
  readonly anexo_servicos: string
  readonly receita_competencia: string
  readonly das_estimado_total: string
  readonly parcelas: ParcelaDasEstimada[]
  readonly faturamento_mensal: FaturamentoMensalRow[]
  readonly avisos: string[]
  readonly perfil: PerfilTributarioSimplesDto
}
