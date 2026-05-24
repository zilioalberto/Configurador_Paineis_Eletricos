/**
 * Cliente HTTP de cadastros comerciais.
 * Rota exposta em `/erp/cadastros` via `erp.registry`.
 */

import apiClient from '@/services/apiClient'
import type {
  ContatoParceiroDto,
  ContatoParceiroPayload,
  EnderecoParceiroDto,
  EnderecoParceiroPayload,
  ParceiroComercialDto,
  ParceiroComercialPayload,
  ParceiroListFilters,
} from '../types/cadastros'

const PARCEIROS_URL = '/cadastros/parceiros/'
const CONTATOS_URL = '/cadastros/contatos/'
const ENDERECOS_URL = '/cadastros/enderecos/'

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    return (data as { results: T[] }).results
  }
  return []
}

function cleanParams(filters: ParceiroListFilters = {}) {
  return {
    ...(filters.tipo ? { tipo: filters.tipo } : {}),
    ...(filters.ativo ? { ativo: filters.ativo } : {}),
    ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
    page_size: 500,
  }
}

/** Lista parceiros com filtros por tipo, ativo e busca textual. */
export async function listarParceiros(
  filters: ParceiroListFilters = {}
): Promise<ParceiroComercialDto[]> {
  const { data } = await apiClient.get<unknown>(PARCEIROS_URL, {
    params: cleanParams(filters),
  })
  return normalizeList<ParceiroComercialDto>(data)
}

export async function obterParceiro(id: string): Promise<ParceiroComercialDto> {
  const { data } = await apiClient.get<ParceiroComercialDto>(`${PARCEIROS_URL}${id}/`)
  return data
}

export async function criarParceiro(
  payload: ParceiroComercialPayload
): Promise<ParceiroComercialDto> {
  const { data } = await apiClient.post<ParceiroComercialDto>(PARCEIROS_URL, payload)
  return data
}

export async function atualizarParceiro(
  id: string,
  payload: Partial<ParceiroComercialPayload>
): Promise<ParceiroComercialDto> {
  const { data } = await apiClient.patch<ParceiroComercialDto>(`${PARCEIROS_URL}${id}/`, payload)
  return data
}

export async function excluirParceiro(id: string): Promise<void> {
  await apiClient.delete(`${PARCEIROS_URL}${id}/`)
}

export async function listarContatosParceiro(parceiroId: string): Promise<ContatoParceiroDto[]> {
  const { data } = await apiClient.get<unknown>(CONTATOS_URL, {
    params: { parceiro: parceiroId, page_size: 500 },
  })
  return normalizeList<ContatoParceiroDto>(data)
}

export async function criarContatoParceiro(
  payload: ContatoParceiroPayload
): Promise<ContatoParceiroDto> {
  const { data } = await apiClient.post<ContatoParceiroDto>(CONTATOS_URL, payload)
  return data
}

export async function atualizarContatoParceiro(
  id: string,
  payload: Partial<ContatoParceiroPayload>
): Promise<ContatoParceiroDto> {
  const { data } = await apiClient.patch<ContatoParceiroDto>(`${CONTATOS_URL}${id}/`, payload)
  return data
}

export async function excluirContatoParceiro(id: string): Promise<void> {
  await apiClient.delete(`${CONTATOS_URL}${id}/`)
}

export async function listarEnderecosParceiro(parceiroId: string): Promise<EnderecoParceiroDto[]> {
  const { data } = await apiClient.get<unknown>(ENDERECOS_URL, {
    params: { parceiro: parceiroId, page_size: 500 },
  })
  return normalizeList<EnderecoParceiroDto>(data)
}

export async function criarEnderecoParceiro(
  payload: EnderecoParceiroPayload
): Promise<EnderecoParceiroDto> {
  const { data } = await apiClient.post<EnderecoParceiroDto>(ENDERECOS_URL, payload)
  return data
}

export async function atualizarEnderecoParceiro(
  id: string,
  payload: Partial<EnderecoParceiroPayload>
): Promise<EnderecoParceiroDto> {
  const { data } = await apiClient.patch<EnderecoParceiroDto>(`${ENDERECOS_URL}${id}/`, payload)
  return data
}

export async function excluirEnderecoParceiro(id: string): Promise<void> {
  await apiClient.delete(`${ENDERECOS_URL}${id}/`)
}
