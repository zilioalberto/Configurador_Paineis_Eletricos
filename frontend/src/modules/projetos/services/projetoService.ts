import apiClient from '../../../services/apiClient'
import type { Projeto, ProjetoFormData } from '../types/projeto'

const BASE_URL = '/projetos/'

type ListResponse<T> = {
  results?: T[]
}

export async function listarProjetos(): Promise<Projeto[]> {
  const response = await apiClient.get<Projeto[] | ListResponse<Projeto>>(BASE_URL)

  if (Array.isArray(response.data)) {
    return response.data
  }

  if ('results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results
  }

  return []
}

export async function obterProjeto(id: string): Promise<Projeto> {
  const response = await apiClient.get<Projeto>(`${BASE_URL}${id}/`)
  return response.data
}

export async function criarProjeto(data: ProjetoFormData): Promise<Projeto> {
  const response = await apiClient.post<Projeto>(BASE_URL, data)
  return response.data
}