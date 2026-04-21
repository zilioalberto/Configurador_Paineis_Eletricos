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

/** Remove aspas duplas repetidas nas extremidades (substitui regex — evita alertas ReDoS). */
function trimAsciiDoubleQuotes(s: string): string {
  let t = s
  while (t.startsWith('"')) t = t.slice(1)
  while (t.endsWith('"')) t = t.slice(0, -1)
  return t
}

function nomeArquivoContentDisposition(cd: string | undefined, fallback: string): string {
  if (!cd) return fallback
  const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(trimAsciiDoubleQuotes(star[1].trim()))
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd)
  if (quoted) return quoted[1].trim()
  const plain = /filename=([^;\s]+)/i.exec(cd)
  return plain ? trimAsciiDoubleQuotes(plain[1].trim()) : fallback
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

function isCombiningDiacritic(code: number): boolean {
  return code >= 0x0300 && code <= 0x036f
}

function isSlugFilenameChar(ch: string): boolean {
  const c = ch.charCodeAt(0)
  return (
    (c >= 0x61 && c <= 0x7a) ||
    (c >= 0x41 && c <= 0x5a) ||
    (c >= 0x30 && c <= 0x39) ||
    ch === '-' ||
    ch === '_'
  )
}

/** Slug ASCII para nome de ficheiro sem regex vulnerável a ReDoS. */
function slugNomeArquivo(valor: string | undefined): string {
  if (!valor) return ''
  const nfd = valor.normalize('NFD')
  let out = ''
  let prevWasSep = false
  for (let i = 0; i < nfd.length; i++) {
    const code = nfd.charCodeAt(i)
    if (isCombiningDiacritic(code)) continue
    const ch = nfd[i]
    if (isSlugFilenameChar(ch)) {
      out += ch
      prevWasSep = false
    } else {
      if (!prevWasSep) {
        out += '_'
        prevWasSep = true
      }
    }
  }
  let start = 0
  let end = out.length
  while (start < end && out[start] === '_') start++
  while (end > start && out[end - 1] === '_') end--
  return out.slice(start, end)
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
