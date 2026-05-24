import apiClient from '@/services/apiClient'
import type { DashboardResumo } from '../types/dashboard'

export async function obterDashboardResumo(): Promise<DashboardResumo> {
  const response = await apiClient.get<DashboardResumo>('/configurador/dashboard/resumo/')
  return response.data
}
