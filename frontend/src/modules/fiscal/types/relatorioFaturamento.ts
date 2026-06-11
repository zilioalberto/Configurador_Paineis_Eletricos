import type { AnexoSimplesNacional, ObjetivoSaidaFiscal, TipoDocumentoFiscalEmitido } from './documentoFiscalRecebido'

export type RelatorioFaturamentoFiltros = {
  readonly data_inicio?: string
  readonly data_fim?: string
  readonly cliente?: string
  readonly objetivo_saida?: ObjetivoSaidaFiscal | ''
  /** `SERVICO` filtra notas sem anexo definido (agregação do backend). */
  readonly anexo_simples?: AnexoSimplesNacional | 'SERVICO'
  readonly tipo_documento?: TipoDocumentoFiscalEmitido | ''
  readonly top_clientes?: number
}

export type RelatorioFaturamentoResumo = {
  readonly valor_total: string
  readonly quantidade_documentos: number
  readonly ticket_medio: string
  readonly clientes_distintos: number
  readonly meses_no_periodo: number
}

export type RelatorioFaturamentoPorMes = {
  readonly competencia: string
  readonly valor_nfes: string
  readonly valor_ajuste: string
  readonly valor_total: string
  readonly quantidade_documentos: number
  readonly por_anexo: Record<string, string>
}

export type RelatorioFaturamentoPorCliente = {
  readonly cnpj_destinatario: string
  readonly nome_destinatario: string
  readonly valor_total: string
  readonly quantidade_documentos: number
  readonly participacao_percentual: string
}

export type RelatorioFaturamentoDocumento = {
  readonly id: number
  readonly numero: string
  readonly serie: string
  readonly data_emissao: string | null
  readonly tipo_documento: TipoDocumentoFiscalEmitido
  readonly valor_total: string
  readonly cnpj_destinatario: string
  readonly nome_destinatario: string
  readonly cfop_predominante: string
  readonly anexo_simples: AnexoSimplesNacional
  readonly objetivo_saida: ObjetivoSaidaFiscal
}

export type RelatorioFaturamentoResponse = {
  readonly cnpj: string
  readonly filtros: RelatorioFaturamentoFiltros & {
    readonly data_inicio: string
    readonly data_fim: string
    readonly top_clientes: number
  }
  readonly resumo: RelatorioFaturamentoResumo
  readonly por_mes: RelatorioFaturamentoPorMes[]
  readonly por_cliente: RelatorioFaturamentoPorCliente[]
  readonly por_anexo: ReadonlyArray<{ readonly anexo: string; readonly valor_total: string }>
  readonly por_objetivo: ReadonlyArray<{ readonly objetivo_saida: string; readonly valor_total: string }>
  readonly documentos: RelatorioFaturamentoDocumento[]
}
