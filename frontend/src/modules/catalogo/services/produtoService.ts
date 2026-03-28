import apiClient from '@/services/apiClient'
import type { ProdutoDetail, ProdutoListItem } from '../types/produto'

const BASE_URL = '/catalogo/produtos/'

type ListResponse<T> = { results?: T[] }

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

export async function listarProdutos(categoriaId?: string | null): Promise<ProdutoListItem[]> {
  const response = await apiClient.get<unknown>(BASE_URL, {
    params: categoriaId ? { categoria: categoriaId } : undefined,
  })
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
