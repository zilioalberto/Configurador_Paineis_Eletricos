import apiClient from '@/services/apiClient'

import type { FiscalModuloConfigDto } from '../types/fiscalConfig'

export async function obterFiscalModuloConfig(): Promise<FiscalModuloConfigDto> {
  const response = await apiClient.get<FiscalModuloConfigDto>('/fiscal/config/')
  return response.data
}
