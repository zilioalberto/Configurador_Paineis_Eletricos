import apiClient from '@/services/apiClient'
import type { PatchCondutoresPayload, ResumoDimensionamento } from '../types/dimensionamento'

export async function obterDimensionamentoPorProjeto(
  projetoId: string
): Promise<ResumoDimensionamento> {
  const response = await apiClient.get<ResumoDimensionamento>(
    `/dimensionamento/projeto/${projetoId}/`
  )
  return response.data
}

export async function recalcularDimensionamento(
  projetoId: string
): Promise<ResumoDimensionamento> {
  const response = await apiClient.post<ResumoDimensionamento>(
    `/dimensionamento/projeto/${projetoId}/recalcular/`
  )
  return response.data
}

export async function patchCondutoresDimensionamento(
  projetoId: string,
  payload: PatchCondutoresPayload
): Promise<ResumoDimensionamento> {
  const response = await apiClient.patch<ResumoDimensionamento>(
    `/dimensionamento/projeto/${projetoId}/condutores/`,
    payload
  )
  return response.data
}
