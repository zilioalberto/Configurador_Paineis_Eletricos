import apiClient from '@/services/apiClient'
import type { ServicoDetail, ServicoListItem } from '../types/servico'

const BASE_URL = '/catalogo/servicos/'

type ListResponse<T> = { results?: T[] }

export type ServicoListPage = {
  readonly items: ServicoListItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasNext: boolean
  readonly hasPrevious: boolean
}

function normalizeList(data: unknown): ServicoListItem[] {
  if (Array.isArray(data)) return data as ServicoListItem[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<ServicoListItem>).results)
  ) {
    return (data as ListResponse<ServicoListItem>).results!
  }
  return []
}

function normalizeListPage(data: unknown, page: number, pageSize: number): ServicoListPage {
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<ServicoListItem>).results)
  ) {
    const payload = data as {
      count?: unknown
      next?: unknown
      previous?: unknown
      results: ServicoListItem[]
    }
    return {
      items: payload.results,
      total: typeof payload.count === 'number' ? payload.count : payload.results.length,
      page,
      pageSize,
      hasNext: Boolean(payload.next),
      hasPrevious: Boolean(payload.previous),
    }
  }
  const items = normalizeList(data)
  return {
    items,
    total: items.length,
    page,
    pageSize,
    hasNext: false,
    hasPrevious: false,
  }
}

export async function listarServicos(page = 1, pageSize = 50): Promise<ServicoListPage> {
  const response = await apiClient.get<unknown>(BASE_URL, {
    params: { page, page_size: pageSize },
  })
  return normalizeListPage(response.data, page, pageSize)
}

export async function buscarServicosAutocomplete(
  termo: string,
  minChars = 2
): Promise<ServicoListItem[]> {
  const t = termo.trim()
  if (t.length < minChars) return []
  const response = await apiClient.get<unknown>(BASE_URL, { params: { search: t } })
  return normalizeList(response.data)
}

export async function obterServico(id: string): Promise<ServicoDetail> {
  const response = await apiClient.get<ServicoDetail>(`${BASE_URL}${id}/`)
  return response.data
}

export async function criarServico(body: unknown): Promise<ServicoDetail> {
  const response = await apiClient.post<ServicoDetail>(BASE_URL, body)
  return response.data
}

export async function atualizarServico(id: string, body: unknown): Promise<ServicoDetail> {
  const response = await apiClient.put<ServicoDetail>(`${BASE_URL}${id}/`, body)
  return response.data
}

export async function excluirServico(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}${id}/`)
}
