/** Cliente HTTP para consulta, recálculo e PATCH de condutores por projeto. */

import apiClient from '@/services/apiClient'
import type { PatchCondutoresPayload, ResumoDimensionamento } from '../types/dimensionamento'

export async function obterDimensionamentoPorProjeto(
  projetoId: string
): Promise<ResumoDimensionamento> {
  const response = await apiClient.get<ResumoDimensionamento>(
    `/configurador/dimensionamento/projeto/${projetoId}/`
  )
  return response.data
}

export async function recalcularDimensionamento(
  projetoId: string
): Promise<ResumoDimensionamento> {
  const response = await apiClient.post<ResumoDimensionamento>(
    `/configurador/dimensionamento/projeto/${projetoId}/recalcular/`
  )
  return response.data
}

export async function patchCondutoresDimensionamento(
  projetoId: string,
  payload: PatchCondutoresPayload
): Promise<ResumoDimensionamento> {
  const response = await apiClient.patch<ResumoDimensionamento>(
    `/configurador/dimensionamento/projeto/${projetoId}/condutores/`,
    payload
  )
  return response.data
}
