/**
 * Cliente HTTP: NF-es recebidas (armazenamento SEFAZ), importação manual e controle NSU.
 */
import apiClient from '@/services/apiClient'

import type {
  ControleNsuDto,
  DocumentoFiscalRecebidoDetail,
  DocumentoFiscalRecebidoListRow,
  ImportarDocumentoEmitidoResponse,
  ImportarNfeXmlResponse,
  NfesRecebidasFiltros,
  ObjetivoEntradaFiscal,
  ObjetivoSaidaFiscal,
  RelatorioNFeFiltros,
  RelatorioNFeResponse,
  TipoDocumentoFiscalEmitido,
  TipoManifestacaoDestinatario,
} from '../types/documentoFiscalRecebido'

const NFES_URL = '/fiscal/nfes/'
const IMPORT_MANUAL_URL = '/fiscal/nfes/importar-manual/'
const IMPORT_EMITIDA_MANUAL_URL = '/fiscal/nfes-emitidas/importar-manual/'
const RELATORIO_NFES_URL = '/fiscal/relatorios/nfes/'

type ListResponse<T> = { results?: T[] }

function normalizeTotal(count: unknown, fallback: number): number {
  if (typeof count === 'number') return count
  if (typeof count !== 'string' || count === '') return fallback
  const parsed = Number(count)
  return Number.isNaN(parsed) ? fallback : parsed
}

export type NfesRecebidasListPage = {
  readonly items: DocumentoFiscalRecebidoListRow[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasNext: boolean
  readonly hasPrevious: boolean
}

function normalizeListPage(
  data: unknown,
  page: number,
  pageSize: number,
): NfesRecebidasListPage {
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<DocumentoFiscalRecebidoListRow>).results)
  ) {
    const payload = data as {
      count?: unknown
      next?: unknown
      previous?: unknown
      results: DocumentoFiscalRecebidoListRow[]
    }
    return {
      items: payload.results,
      total: normalizeTotal(payload.count, payload.results.length),
      page,
      pageSize,
      hasNext: Boolean(payload.next),
      hasPrevious: Boolean(payload.previous),
    }
  }
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    hasNext: false,
    hasPrevious: false,
  }
}

function filtrosParaParams(filtros: NfesRecebidasFiltros): Record<string, string> {
  const params: Record<string, string> = {}
  const add = (key: string, raw: string | undefined, digitsOnly = false) => {
    const v = (raw ?? '').trim()
    if (!v) return
    params[key] = digitsOnly ? v.replace(/\D/g, '') : v
  }
  add('chave_acesso', (filtros.chave_acesso ?? '').replace(/\s/g, ''))
  add('cnpj_emitente', filtros.cnpj_emitente, true)
  add('cnpj_destinatario', filtros.cnpj_destinatario, true)
  add('numero', filtros.numero)
  add('serie', filtros.serie)
  add('status_importacao', filtros.status_importacao)
  add('origem_importacao', filtros.origem_importacao)
  add('objetivo_entrada', filtros.objetivo_entrada)
  add('manifestacao_status', filtros.manifestacao_status)
  return params
}

function relatorioFiltrosParaParams(filtros: RelatorioNFeFiltros): Record<string, string> {
  const params: Record<string, string> = {}
  const add = (key: string, raw: string | undefined, digitsOnly = false) => {
    const v = (raw ?? '').trim()
    if (!v) return
    params[key] = digitsOnly ? v.replace(/\D/g, '') : v
  }
  add('tipo_movimento', filtros.tipo_movimento || 'ENTRADA')
  add('data_inicio', filtros.data_inicio)
  add('data_fim', filtros.data_fim)
  add('objetivo_entrada', filtros.objetivo_entrada)
  add('objetivo_saida', filtros.objetivo_saida)
  add('cnpj_emitente', filtros.cnpj_emitente, true)
  add('cnpj_destinatario', filtros.cnpj_destinatario, true)
  add('fornecedor', filtros.fornecedor)
  add('cliente', filtros.cliente)
  return params
}

export type SolicitarManifestacaoPayload = {
  readonly tipo: TipoManifestacaoDestinatario
  readonly justificativa?: string
}

export type SolicitarManifestacaoResponse = {
  readonly message: string
  readonly documento: DocumentoFiscalRecebidoDetail
}

/** Lista NF-es recebidas com filtros opcionais. */
export async function listarNfesRecebidas(
  filtros: NfesRecebidasFiltros,
  page = 1,
  pageSize = 50,
): Promise<NfesRecebidasListPage> {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
    ...filtrosParaParams(filtros),
  }
  const response = await apiClient.get<unknown>(NFES_URL, { params })
  return normalizeListPage(response.data, page, pageSize)
}

/** Detalhe com itens e XML original. */
export async function obterNfeRecebida(id: number): Promise<DocumentoFiscalRecebidoDetail> {
  const response = await apiClient.get<DocumentoFiscalRecebidoDetail>(`${NFES_URL}${id}/`)
  return response.data
}

/** Relatório mensal/gerencial de NF-es, com totais e itens para conferência rápida. */
export async function obterRelatorioNfes(
  filtros: RelatorioNFeFiltros,
): Promise<RelatorioNFeResponse> {
  const response = await apiClient.get<RelatorioNFeResponse>(RELATORIO_NFES_URL, {
    params: relatorioFiltrosParaParams(filtros),
  })
  return response.data
}

export type ImportarNfeXmlPayload = {
  readonly xml: string
  readonly cnpj_destinatario?: string
  readonly nsu?: string
  readonly objetivo_entrada?: ObjetivoEntradaFiscal
}

/** Importa XML pelo portal (origem MANUAL no servidor). */
export async function importarNfeXmlManual(
  payload: ImportarNfeXmlPayload,
): Promise<ImportarNfeXmlResponse> {
  const body: Record<string, string> = { xml: payload.xml }
  const cnpj = (payload.cnpj_destinatario ?? '').replace(/\D/g, '')
  if (cnpj) body.cnpj_destinatario = cnpj
  const nsu = (payload.nsu ?? '').replace(/\D/g, '')
  if (nsu) body.nsu = nsu
  if (payload.objetivo_entrada) body.objetivo_entrada = payload.objetivo_entrada
  const response = await apiClient.post<ImportarNfeXmlResponse>(IMPORT_MANUAL_URL, body)
  return response.data
}

export type ImportarDocumentoEmitidoPayload = {
  readonly xml: string
  readonly tipo_documento: TipoDocumentoFiscalEmitido
  readonly objetivo_saida?: ObjetivoSaidaFiscal
}

/** Importa XML emitido pela ZFW (NF-e de produto ou NFS-e de serviço). */
export async function importarDocumentoEmitidoManual(
  payload: ImportarDocumentoEmitidoPayload,
): Promise<ImportarDocumentoEmitidoResponse> {
  const response = await apiClient.post<ImportarDocumentoEmitidoResponse>(
    IMPORT_EMITIDA_MANUAL_URL,
    payload,
  )
  return response.data
}

/** Consulta controle NSU (leitura; sincronização SEFAZ via agente). */
/** Enfileira manifestação do destinatário (processada pela ponte A3). */
export async function solicitarManifestacaoDestinatario(
  documentoId: number,
  payload: SolicitarManifestacaoPayload,
): Promise<SolicitarManifestacaoResponse> {
  const response = await apiClient.post<SolicitarManifestacaoResponse>(
    `/fiscal/nfes/${documentoId}/solicitar-manifestacao/`,
    payload,
  )
  return response.data
}

export async function obterControleNsu(cnpj: string): Promise<ControleNsuDto> {
  const digits = cnpj.replace(/\D/g, '')
  const response = await apiClient.get<ControleNsuDto>(`/fiscal/nsu/${digits}/`)
  return response.data
}
