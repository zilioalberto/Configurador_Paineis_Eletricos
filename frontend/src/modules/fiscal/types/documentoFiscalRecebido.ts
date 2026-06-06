/** Status de importação persistido no servidor (DocumentoFiscalRecebido). */
export type StatusImportacaoFiscal =
  | 'RECEBIDA'
  | 'PROCESSADA'
  | 'ERRO'
  | 'IGNORADA'

/** Origem da importação da NF-e. */
export type OrigemImportacaoFiscal = 'MANUAL' | 'PONTE_A3' | 'API' | 'OUTRO'

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
  readonly manifestacao_status?: StatusManifestacaoDestinatario | ''
}
