import apiClient from '@/services/apiClient'
import type { CategoriaProduto } from '../types/categoria'

const BASE_URL = '/catalogo/categorias/'

type ListResponse<T> = { results?: T[] }

export async function listarCategoriasProduto(): Promise<CategoriaProduto[]> {
  const response = await apiClient.get<CategoriaProduto[] | ListResponse<CategoriaProduto>>(
    BASE_URL
  )
  if (Array.isArray(response.data)) return response.data
  if ('results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results
  }
  return []
}
