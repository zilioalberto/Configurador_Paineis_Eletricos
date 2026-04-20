import apiClient from '@/services/apiClient'
import type {
  AprovarSugestaoResponse,
  ComposicaoSnapshot,
  InclusaoManualItem,
  ProdutoAlternativa,
} from '../types/composicao'

export async function obterComposicaoPorProjeto(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.get<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/`
  )
  return response.data
}

export async function gerarSugestoesComposicao(
  projetoId: string,
  limparAntes = true
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/gerar-sugestoes/`,
    { limpar_antes: limparAntes }
  )
  return response.data
}

export async function reavaliarPendenciasComposicao(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/reavaliar-pendencias/`,
    {}
  )
  return response.data
}

export async function listarAlternativasSugestao(
  sugestaoId: string
): Promise<ProdutoAlternativa[]> {
  const response = await apiClient.get<{ alternativas: ProdutoAlternativa[] }>(
    `/composicao/sugestoes/${sugestaoId}/alternativas/`
  )
  return response.data.alternativas
}

export async function aprovarSugestao(
  sugestaoId: string,
  produtoId?: string | null
): Promise<AprovarSugestaoResponse> {
  const body =
    produtoId != null && produtoId !== '' ? { produto_id: produtoId } : {}
  const response = await apiClient.post<AprovarSugestaoResponse>(
    `/composicao/sugestoes/${sugestaoId}/aprovar/`,
    body
  )
  return response.data
}

export async function reabrirComposicaoItem(
  composicaoItemId: string
): Promise<{ snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.post<{ snapshot: ComposicaoSnapshot }>(
    `/composicao/itens/${composicaoItemId}/reabrir/`,
    {}
  )
  return response.data
}

export type AdicionarInclusaoManualBody = {
  produto_id: string
  quantidade?: string
  observacoes?: string
}

export async function adicionarInclusaoManual(
  projetoId: string,
  body: AdicionarInclusaoManualBody
): Promise<{ inclusao_manual: InclusaoManualItem; snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.post<{
    inclusao_manual: InclusaoManualItem
    snapshot: ComposicaoSnapshot
  }>(`/composicao/projeto/${projetoId}/inclusoes-manuais/`, body)
  return response.data
}

export async function removerInclusaoManual(
  inclusaoId: string
): Promise<{ snapshot: ComposicaoSnapshot }> {
  const response = await apiClient.delete<{ snapshot: ComposicaoSnapshot }>(
    `/composicao/inclusoes-manuais/${inclusaoId}/`
  )
  return response.data
}

function nomeArquivoContentDisposition(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ''))
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd)
  if (quoted) return quoted[1].trim()
  const plain = /filename=([^;\s]+)/i.exec(cd)
  return plain ? plain[1].trim().replace(/^"+|"+$/g, '') : fallback
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
  URL.revokeObjectURL(url)
}

function slugNomeArquivo(valor: string | undefined): string {
  if (!valor) return ''
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Lista completa: composição aprovada, inclusões manuais e pendências (.xlsx). */
export async function exportarComposicaoListaXlsx(
  projetoId: string,
  nomeProjeto?: string
): Promise<void> {
  const res = await apiClient.get<Blob>(`/composicao/projeto/${projetoId}/export/xlsx/`, {
    responseType: 'blob',
  })
  const fallback = `${slugNomeArquivo(nomeProjeto) || projetoId}.xlsx`
  const nome = nomeArquivoContentDisposition(
    res.headers['content-disposition'],
    fallback
  )
  dispararDownloadBlob(res.data, nome)
}

/** Mesma listagem em PDF (inclui pendências). */
export async function exportarComposicaoListaPdf(
  projetoId: string,
  nomeProjeto?: string
): Promise<void> {
  const res = await apiClient.get<Blob>(`/composicao/projeto/${projetoId}/export/pdf/`, {
    responseType: 'blob',
  })
  const fallback = `${slugNomeArquivo(nomeProjeto) || projetoId}.pdf`
  const nome = nomeArquivoContentDisposition(
    res.headers['content-disposition'],
    fallback
  )
  dispararDownloadBlob(res.data, nome)
}
