import apiClient from '@/services/apiClient'
import type {
  NfeAplicarPayload,
  NfeAplicarResponse,
  NfeFornecedorOption,
  NfePreviewResponse,
  NfeProdutoExistenteResumo,
} from '../types/nfeImport'

export async function previewNfeXml(arquivo: File): Promise<NfePreviewResponse> {
  const body = new FormData()
  body.append('arquivo', arquivo)
  const { data } = await apiClient.post<NfePreviewResponse>(
    '/catalogo/importacoes/nfe/preview/',
    body
  )
  return data
}

export async function aplicarImportacaoNfe(payload: NfeAplicarPayload): Promise<NfeAplicarResponse> {
  const { data } = await apiClient.post<NfeAplicarResponse>(
    '/catalogo/importacoes/nfe/aplicar/',
    payload
  )
  return data
}

export async function listarFornecedoresNfe(search?: string): Promise<NfeFornecedorOption[]> {
  const { data } = await apiClient.get<NfeFornecedorOption[]>(
    '/catalogo/importacoes/nfe/fornecedores/',
    {
      params: search?.trim() ? { search: search.trim() } : undefined,
    }
  )
  return data
}

export async function buscarProdutoResumoImportacaoNfe(
  codigo: string,
): Promise<NfeProdutoExistenteResumo | null> {
  const c = codigo.trim()
  if (!c) return null
  const { data } = await apiClient.get<{ produto: NfeProdutoExistenteResumo | null }>(
    '/catalogo/importacoes/nfe/produto-resumo/',
    { params: { codigo: c } },
  )
  return data.produto ?? null
}
