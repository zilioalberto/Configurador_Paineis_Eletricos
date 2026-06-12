/** Status de importação persistido no servidor (DocumentoFiscalRecebido). */
export type StatusImportacaoFiscal =
  | 'RECEBIDA'
  | 'PROCESSADA'
  | 'ERRO'
  | 'IGNORADA'

/** Origem da importação da NF-e. */
export type OrigemImportacaoFiscal = 'MANUAL' | 'PONTE_A3' | 'SEFAZ_SYNC' | 'API' | 'OUTRO'

export type ObjetivoEntradaFiscal =
  | 'INDUSTRIALIZACAO'
  | 'REVENDA'
  | 'USO_CONSUMO'
  | 'ATIVO_IMOBILIZADO'
  | 'DEVOLUCAO_VENDA'
  | 'RETORNO_INDUSTRIALIZACAO'
  | 'RETORNO_CONSERTO_REPARO'
  | 'TRANSFERENCIA'
  | 'BONIFICACAO_DOACAO_BRINDE'
  | 'AMOSTRA_GRATIS'
  | 'COMODATO_EMPRESTIMO'
  | 'DEMONSTRACAO'
  | 'IMPORTACAO'
  | 'OUTRAS_ENTRADAS'

export type TipoDocumentoFiscalEmitido = 'NFE_PRODUTO' | 'NFSE_SERVICO'

export type AnexoSimplesNacional = 'I' | 'II' | 'III' | 'V' | 'NENHUM' | ''

export type ClassificacaoFiscalOrigem = 'AUTOMATICA' | 'MANUAL'

export type ObjetivoSaidaFiscal =
  | 'VENDA_PRODUTO'
  | 'PRESTACAO_SERVICO'
  | 'INDUSTRIALIZACAO'
  | 'DEVOLUCAO_COMPRA'
  | 'REMESSA'
  | 'TRANSFERENCIA'
  | 'BONIFICACAO_DOACAO_BRINDE'
  | 'OUTRAS_SAIDAS'

export type TipoManifestacaoDestinatario =
  | 'CIENCIA'
  | 'CONFIRMACAO'
  | 'DESCONHECIMENTO'
  | 'NAO_REALIZADA'

export type StatusManifestacaoDestinatario =
  | 'NAO_SOLICITADA'
  | 'PENDENTE'
  | 'MANIFESTADA'
  | 'ERRO'

export type ItemDocumentoFiscalRow = {
  readonly id: number
  readonly numero_item: number
  readonly codigo_fornecedor: string
  readonly descricao: string
  readonly ncm: string
  readonly cfop: string
  readonly unidade: string
  readonly quantidade: string
  readonly valor_unitario: string
  readonly valor_total: string
  readonly importado_para_produto: boolean
  readonly criado_em: string
  readonly atualizado_em: string
}

export type DocumentoFiscalRecebidoListRow = {
  readonly id: number
  readonly chave_acesso: string
  readonly nsu: string
  readonly cnpj_emitente: string
  readonly nome_emitente: string
  readonly cnpj_destinatario: string
  readonly nome_destinatario: string
  readonly numero: string
  readonly serie: string
  readonly data_emissao: string | null
  readonly valor_total: string
  readonly natureza_operacao: string
  readonly status_importacao: StatusImportacaoFiscal
  readonly origem_importacao: OrigemImportacaoFiscal
  readonly objetivo_entrada: ObjetivoEntradaFiscal
  readonly manifestacao_status: StatusManifestacaoDestinatario
  readonly manifestacao_tipo: TipoManifestacaoDestinatario | ''
  readonly manifestacao_justificativa: string
  readonly manifestacao_protocolo: string
  readonly manifestacao_cstat: string
  readonly manifestacao_motivo: string
  readonly manifestacao_solicitada_em: string | null
  readonly manifestacao_registrada_em: string | null
  readonly itens: ItemDocumentoFiscalRow[]
  readonly criada_em: string
  readonly atualizada_em: string
}

export type DocumentoFiscalRecebidoDetail = DocumentoFiscalRecebidoListRow & {
  readonly xml_original: string
}

export type ImportarNfeXmlResponse = {
  readonly created: boolean
  readonly message: string
  readonly documento_id: number
  readonly chave_acesso: string
}

export type ControleNsuDto = {
  readonly id: number
  readonly cnpj: string
  readonly ultimo_nsu: string
  readonly max_nsu: string
  readonly ultimo_cstat: string
  readonly ultimo_motivo: string
  readonly bloqueado_ate: string | null
  readonly ultima_consulta: string | null
  readonly criado_em: string
  readonly atualizado_em: string
}

export type NfesRecebidasFiltros = {
  readonly chave_acesso?: string
  readonly cnpj_emitente?: string
  readonly cnpj_destinatario?: string
  readonly numero?: string
  readonly serie?: string
  readonly status_importacao?: StatusImportacaoFiscal | ''
  readonly origem_importacao?: OrigemImportacaoFiscal | ''
  readonly objetivo_entrada?: ObjetivoEntradaFiscal | ''
  readonly manifestacao_status?: StatusManifestacaoDestinatario | ''
}

export type TipoMovimentoRelatorioNFe = 'ENTRADA' | 'SAIDA' | 'TODOS'

export type RelatorioNFeFiltros = {
  readonly tipo_movimento?: TipoMovimentoRelatorioNFe
  readonly competencia?: string
  readonly data_inicio?: string
  readonly data_fim?: string
  readonly objetivo_entrada?: ObjetivoEntradaFiscal | ''
  readonly objetivo_saida?: ObjetivoSaidaFiscal | ''
  readonly cnpj_emitente?: string
  readonly cnpj_destinatario?: string
  readonly fornecedor?: string
  readonly cliente?: string
}

export type RelatorioNFePorObjetivo = {
  readonly tipo_movimento: 'ENTRADA' | 'SAIDA'
  readonly objetivo: ObjetivoEntradaFiscal | ObjetivoSaidaFiscal
  readonly total_documentos: number
  readonly valor_total: string
}

export type RelatorioNFeResumo = {
  readonly tipo_movimento: TipoMovimentoRelatorioNFe
  readonly total_documentos: number
  readonly valor_total: string
  readonly por_objetivo: RelatorioNFePorObjetivo[]
}

export type RelatorioNFeResponse = {
  readonly filtros: RelatorioNFeFiltros
  readonly resumo: RelatorioNFeResumo
  readonly documentos: RelatorioNFeDocumentoRow[]
}

export type ItemDocumentoFiscalRelatorioRow = {
  readonly id: number
  readonly numero_item: number
  readonly codigo_fornecedor?: string
  readonly codigo?: string
  readonly descricao: string
  readonly ncm: string
  readonly cfop: string
  readonly unidade: string
  readonly quantidade: string
  readonly valor_unitario: string
  readonly valor_total: string
}

export type RelatorioNFeDocumentoRow = {
  readonly id: number
  readonly tipo_movimento: 'ENTRADA' | 'SAIDA'
  readonly tipo_documento: TipoDocumentoFiscalEmitido
  readonly chave_acesso: string
  readonly numero: string
  readonly serie: string
  readonly data_emissao: string | null
  readonly valor_total: string
  readonly natureza_operacao: string
  readonly participante_nome: string
  readonly participante_cnpj: string
  readonly objetivo: ObjetivoEntradaFiscal | ObjetivoSaidaFiscal
  readonly nome_emitente?: string
  readonly cnpj_emitente?: string
  readonly nome_destinatario?: string
  readonly cnpj_destinatario?: string
  readonly itens: ItemDocumentoFiscalRelatorioRow[]
}

export type ImportarDocumentoEmitidoResponse = {
  readonly created: boolean
  readonly message: string
  readonly documento_id: number
  readonly documento_public_id: string
  readonly identificador: string
}

export type ItemDocumentoFiscalEmitidoRow = {
  readonly id: number
  readonly numero_item: number
  readonly codigo: string
  readonly descricao: string
  readonly ncm: string
  readonly cfop: string
  readonly unidade: string
  readonly quantidade: string
  readonly valor_unitario: string
  readonly valor_total: string
}

export type DocumentoFiscalEmitidoListRow = {
  readonly id: number
  readonly public_id: string
  readonly identificador: string
  readonly tipo_documento: TipoDocumentoFiscalEmitido
  readonly chave_acesso: string
  readonly cnpj_emitente: string
  readonly nome_emitente: string
  readonly cnpj_destinatario: string
  readonly nome_destinatario: string
  readonly numero: string
  readonly serie: string
  readonly data_emissao: string | null
  readonly valor_total: string
  readonly natureza_operacao: string
  readonly objetivo_saida: ObjetivoSaidaFiscal
  readonly origem_importacao: OrigemImportacaoFiscal
  readonly cfop_predominante: string
  readonly anexo_simples: AnexoSimplesNacional
  readonly incluir_faturamento: boolean
  readonly classificacao_origem: ClassificacaoFiscalOrigem
  readonly itens: ItemDocumentoFiscalEmitidoRow[]
  readonly criada_em: string
  readonly atualizada_em: string
}

export type DocumentoFiscalEmitidoDetail = DocumentoFiscalEmitidoListRow & {
  readonly xml_original: string
}

export type NfesEmitidasFiltros = {
  readonly tipo_documento?: TipoDocumentoFiscalEmitido | ''
  readonly competencia?: string
  readonly data_inicio?: string
  readonly data_fim?: string
  readonly objetivo_saida?: ObjetivoSaidaFiscal | ''
  readonly cfop?: string
  readonly anexo_simples?: AnexoSimplesNacional
  readonly incluir_faturamento?: 'true' | 'false' | ''
  readonly cnpj_destinatario?: string
  readonly cliente?: string
  readonly numero?: string
}

export type ImportarLoteDocumentosEmitidosResponse = {
  readonly total: number
  readonly criados: number
  readonly duplicados: number
  readonly erros: number
  readonly itens: ReadonlyArray<{
    readonly indice: number
    readonly sucesso: boolean
    readonly created: boolean
    readonly documento_id: number | null
    readonly identificador: string
    readonly mensagem: string
  }>
}
