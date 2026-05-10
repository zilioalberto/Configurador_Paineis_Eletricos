import apiClient from '@/services/apiClient'
import type { ItemFiscalProdutoListRow } from '../types/itemFiscalProduto'

const BASE_URL = '/fiscal/itens-fiscais/'

type ListResponse<T> = { results?: T[] }

export type ItensFiscaisListPage = {
  readonly items: ItemFiscalProdutoListRow[]
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
): ItensFiscaisListPage {
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as ListResponse<ItemFiscalProdutoListRow>).results)
  ) {
    const payload = data as {
      count?: unknown
      next?: unknown
      previous?: unknown
      results: ItemFiscalProdutoListRow[]
    }
    return {
      items: payload.results,
      total:
        typeof payload.count === 'number'
          ? payload.count
          : typeof payload.count === 'string' && payload.count !== '' && !Number.isNaN(Number(payload.count))
            ? Number(payload.count)
            : payload.results.length,
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

export async function listarItensFiscais(
  search = '',
  page = 1,
  pageSize = 50,
): Promise<ItensFiscaisListPage> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  const q = search.trim()
  if (q) params.search = q
  const response = await apiClient.get<unknown>(BASE_URL, { params })
  return normalizeListPage(response.data, page, pageSize)
}
