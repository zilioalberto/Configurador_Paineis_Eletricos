import { getApiBaseUrl } from '@/services/apiBaseUrl'

import type { OrcamentoPreviewOfertaDto } from '../types/orcamentos'

export type OfertaPublicaRespostaDto = {
  decisao: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  nome_responsavel: string
  aceite_em: string | null
  observacao: string
}

export type OfertaPublicaDto = {
  preview: OrcamentoPreviewOfertaDto
  valido_ate: string
  codigo: string
  resposta: OfertaPublicaRespostaDto
}

export type ResponderOfertaPublicaPayload = {
  decisao: 'APROVADO' | 'REJEITADO'
  nome_responsavel: string
  cargo?: string
  email?: string
  observacao?: string
  assinatura_data_url?: string
}

async function parseJsonError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string }
    return body.detail || res.statusText
  } catch {
    return res.statusText
  }
}

export async function obterOfertaPublica(token: string): Promise<OfertaPublicaDto> {
  const res = await fetch(`${getApiBaseUrl()}/oferta-publica/${encodeURIComponent(token)}/`)
  if (!res.ok) throw new Error(await parseJsonError(res))
  return res.json() as Promise<OfertaPublicaDto>
}

export async function responderOfertaPublica(
  token: string,
  payload: ResponderOfertaPublicaPayload
): Promise<{ decisao: string; mensagem: string }> {
  const res = await fetch(
    `${getApiBaseUrl()}/oferta-publica/${encodeURIComponent(token)}/responder/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error(await parseJsonError(res))
  return res.json() as Promise<{ decisao: string; mensagem: string }>
}

export async function enviarPdfAssinadoOfertaPublica(
  token: string,
  arquivo: File
): Promise<void> {
  const form = new FormData()
  form.append('arquivo', arquivo)
  const res = await fetch(
    `${getApiBaseUrl()}/oferta-publica/${encodeURIComponent(token)}/pdf-assinado/`,
    { method: 'POST', body: form }
  )
  if (!res.ok) throw new Error(await parseJsonError(res))
}
