import apiClient from '@/services/apiClient'

export type PlcFamiliasResponse = { familias: string[] }

export async function listarPlcFamilias(): Promise<PlcFamiliasResponse> {
  const { data } = await apiClient.get<PlcFamiliasResponse>('/catalogo/plc-familias/')
  return data
}
