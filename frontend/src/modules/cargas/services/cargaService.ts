import apiClient from '@/services/apiClient'
import type { CargaDetail, CargaListItem } from '../types/carga'

const BASE_URL = '/cargas/'

type ListResponse<T> = {
  results?: T[]
}

export async function listarCargas(projetoId: string): Promise<CargaListItem[]> {
  const response = await apiClient.get<CargaListItem[] | ListResponse<CargaListItem>>(
    BASE_URL,
    { params: { projeto: projetoId } }
  )

  if (Array.isArray(response.data)) {
    return response.data
  }

  if ('results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results
  }

  return []
}

export async function obterCarga(id: string): Promise<CargaDetail> {
  const response = await apiClient.get<CargaDetail>(`${BASE_URL}${id}/`)
  return response.data
}

export async function criarCarga(
  body: Record<string, unknown>
): Promise<CargaDetail> {
  const response = await apiClient.post<CargaDetail>(BASE_URL, body)
  return response.data
}

export async function atualizarCarga(
  id: string,
  body: Record<string, unknown>
): Promise<CargaDetail> {
  const response = await apiClient.put<CargaDetail>(`${BASE_URL}${id}/`, body)
  return response.data
}

export async function deletarCarga(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}${id}/`)
}
