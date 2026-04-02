import apiClient from '@/services/apiClient'
import type { ResumoDimensionamento } from '../types/dimensionamento'

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
