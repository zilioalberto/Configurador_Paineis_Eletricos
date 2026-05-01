import apiClient from '@/services/apiClient'
import type { ProdutoDetail, ProdutoListItem } from '../types/produto'

const BASE_URL = '/catalogo/produtos/'

type ListResponse<T> = { results?: T[] }
export type ProdutoListPage = {
  readonly items: ProdutoListItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly hasNext: boolean
  readonly hasPrevious: boolean
}

function normalizeList(data: unknown): ProdutoListItem[] {
  if (Array.isArray(data)) return data as ProdutoListItem[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<ProdutoListItem>).results)
  ) {
    return (data as ListResponse<ProdutoListItem>).results!
  }
  return []
}

function normalizeListPage(
  data: unknown,
  page: number,
  pageSize: number,
): ProdutoListPage {
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<ProdutoListItem>).results)
  ) {
    const payload = data as {
      count?: unknown
      next?: unknown
      previous?: unknown
      results: ProdutoListItem[]
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

export async function listarProdutos(
  categoriaId?: string | null,
  page = 1,
  pageSize = 50,
): Promise<ProdutoListPage> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (categoriaId) params.categoria = categoriaId
  const response = await apiClient.get<unknown>(BASE_URL, {
    params,
  })
  return normalizeListPage(response.data, page, pageSize)
}

/** Busca typeahead (catálogo ativo); use com debounce no UI. */
export async function buscarProdutosAutocomplete(
  termo: string,
  categoria?: string | null,
): Promise<ProdutoListItem[]> {
  const t = termo.trim()
  if (t.length < 2) return []
  const params: Record<string, string> = { search: t }
  const cat = (categoria ?? '').trim()
  if (cat) params.categoria = cat
  const response = await apiClient.get<unknown>(BASE_URL, { params })
  return normalizeList(response.data)
}

export async function obterProduto(id: string): Promise<ProdutoDetail> {
  const response = await apiClient.get<ProdutoDetail>(`${BASE_URL}${id}/`)
  return response.data
}

export async function criarProduto(body: unknown): Promise<ProdutoDetail> {
  const response = await apiClient.post<ProdutoDetail>(BASE_URL, body)
  return response.data
}

export async function atualizarProduto(id: string, body: unknown): Promise<ProdutoDetail> {
  const response = await apiClient.put<ProdutoDetail>(`${BASE_URL}${id}/`, body)
  return response.data
}

export async function excluirProduto(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}${id}/`)
}
