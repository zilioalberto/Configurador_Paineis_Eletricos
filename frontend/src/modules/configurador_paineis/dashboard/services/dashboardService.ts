/**
 * Cliente HTTP do dashboard (KPIs agregados do configurador).
 */

import apiClient from '@/services/apiClient'
import type { DashboardResumo } from '../types/dashboard'

/** Obtém contadores e projetos recentes para o painel inicial. */
export async function obterDashboardResumo(): Promise<DashboardResumo> {
  const response = await apiClient.get<DashboardResumo>('/dashboard/resumo/')
  return response.data
}
