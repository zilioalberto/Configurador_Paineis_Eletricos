/**
 * Cliente HTTP da API de composição (snapshot, mutações e exportação).
 */

import apiClient from '@/services/apiClient'
import type {
  AprovarSugestaoResponse,
  ComposicaoSnapshot,
  InclusaoManualItem,
  ProdutoAlternativa,
} from '../types/composicao'
import { nomeArquivoContentDisposition, slugNomeArquivo } from './composicaoExportHelpers'

/** Obtém snapshot completo da composição do projeto. */
export async function obterComposicaoPorProjeto(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.get<ComposicaoSnapshot>(
    `/configurador/composicao/projeto/${projetoId}/`
  )
  return response.data
}

/** Dispara o orquestrador de sugestões no backend. */
export async function gerarSugestoesComposicao(
  projetoId: string,
  limparAntes = true
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/configurador/composicao/projeto/${projetoId}/gerar-sugestoes/`,
    { limpar_antes: limparAntes },
    { timeout: 120_000 }
  )
  return response.data
}

/** Reexecuta regras de composição para pendências abertas. */
export async function reavaliarPendenciasComposicao(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/configurador/composicao/projeto/${projetoId}/reavaliar-pendencias/`,
    {}
  )
  return response.data
}

/** Lista produtos alternativos compatíveis com uma sugestão. */
export async function listarAlternativasSugestao(
  sugestaoId: string
): Promise<ProdutoAlternativa[]> {
  const response = await apiClient.get<{ alternativas: ProdutoAlternativa[] }>(
    `/configurador/composicao/sugestoes/${sugestaoId}/alternativas/`
  )
  return response.data.alternativas
}

/** Aprova sugestão (opcionalmente com produto substituto) e devolve snapshot atualizado. */
export async function aprovarSugestao(
  sugestaoId: string,
  produtoId?: string | null
): Promise<AprovarSugestaoResponse> {
  const body =
    produtoId != null && produtoId !== '' ? { produto_id: produtoId } : {}
  const response = await apiClient.post<AprovarSugestaoResponse>(
    `/configurador/composicao/sugestoes/${sugestaoId}/aprovar/`,
    body
  )
  return response.data
}

/** Reabre item aprovado, devolvendo-o ao estado de sugestão pendente. */
export async function reabrirComposicaoItem(
  composicaoItemId: string
): Promise<{ snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.post<{ snapshot: ComposicaoSnapshot }>(
    `/configurador/composicao/itens/${composicaoItemId}/reabrir/`,
    {}
  )
  return response.data
}

export type AdicionarInclusaoManualBody = {
  produto_id: string
  quantidade?: string
  observacoes?: string
}

/** Adiciona produto do catálogo às inclusões manuais do projeto. */
export async function adicionarInclusaoManual(
  projetoId: string,
  body: AdicionarInclusaoManualBody
): Promise<{ inclusao_manual: InclusaoManualItem; snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.post<{
    inclusao_manual: InclusaoManualItem
    snapshot: ComposicaoSnapshot
  }>(`/configurador/composicao/projeto/${projetoId}/inclusoes-manuais/`, body)
  return response.data
}

/** Remove inclusão manual e devolve snapshot atualizado. */
export async function removerInclusaoManual(
  inclusaoId: string
): Promise<{ snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.delete<{ snapshot: ComposicaoSnapshot }>(
    `/configurador/composicao/inclusoes-manuais/${inclusaoId}/`
  )
  return response.data
}

function dispararDownloadBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Lista completa: composição aprovada, sugestões finais, inclusões manuais e pendências (.xlsx). */
export async function exportarComposicaoListaXlsx(
  projetoId: string,
  nomeProjeto?: string
): Promise<void> {
  const res = await apiClient.get<Blob>(`/configurador/composicao/projeto/${projetoId}/export/xlsx/`, {
    responseType: 'blob',
  })
  const fallback = `${slugNomeArquivo(nomeProjeto) || projetoId}.xlsx`
  const nome = nomeArquivoContentDisposition(
    res.headers['content-disposition'],
    fallback
  )
  dispararDownloadBlob(res.data, nome)
}

/** Mesma listagem em PDF: composição aprovada, sugestões finais, inclusões manuais e pendências. */
export async function exportarComposicaoListaPdf(
  projetoId: string,
  nomeProjeto?: string
): Promise<void> {
  const res = await apiClient.get<Blob>(`/configurador/composicao/projeto/${projetoId}/export/pdf/`, {
    responseType: 'blob',
  })
  const fallback = `${slugNomeArquivo(nomeProjeto) || projetoId}.pdf`
  const nome = nomeArquivoContentDisposition(
    res.headers['content-disposition'],
    fallback
  )
  dispararDownloadBlob(res.data, nome)
}
