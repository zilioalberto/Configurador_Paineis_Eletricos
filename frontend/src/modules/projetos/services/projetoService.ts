import apiClient from '@/services/apiClient'
import type {
  Projeto,
  ProjetoEvento,
  ProjetoFormData,
  ProjetoResponsavelOption,
} from '../types/projeto'

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

export async function listarHistoricoProjeto(id: string): Promise<ProjetoEvento[]> {
  const response = await apiClient.get<ProjetoEvento[]>(`${BASE_URL}${id}/historico/`)
  return response.data
}

export async function alocarCodigoProjeto(): Promise<{ codigo: string }> {
  const response = await apiClient.post<{ codigo: string }>(
    `${BASE_URL}alocar-codigo/`
  )
  return response.data
}

export async function listarResponsaveisProjeto(): Promise<ProjetoResponsavelOption[]> {
  const response = await apiClient.get<ProjetoResponsavelOption[]>(`${BASE_URL}responsaveis/`)
  return response.data
}

export async function criarProjeto(data: ProjetoFormData): Promise<Projeto> {
  const response = await apiClient.post<Projeto>(BASE_URL, data)
  return response.data
}

export async function atualizarProjeto(
  id: string,
  data: ProjetoFormData
): Promise<Projeto> {
  const response = await apiClient.put<Projeto>(`${BASE_URL}${id}/`, data)
  return response.data
}

export async function deletarProjeto(id: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}${id}/`)
}
