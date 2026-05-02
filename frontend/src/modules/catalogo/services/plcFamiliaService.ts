import apiClient from '@/services/apiClient'

export type PlcFamiliasResponse = { familias: string[] }

export type ListarPlcFamiliasOptions = {
  /** Apenas `EspecificacaoPLC.familia` (tabela `catalogo_especificacaoplc`). */
  apenasEspecificacaoPlc?: boolean
}

export async function listarPlcFamilias(
  options?: ListarPlcFamiliasOptions
): Promise<PlcFamiliasResponse> {
  const axiosConfig =
    options?.apenasEspecificacaoPlc === true
      ? { params: { apenas_especificacao_plc: '1' } }
      : undefined
  const { data } = await apiClient.get<PlcFamiliasResponse>(
    '/catalogo/plc-familias/',
    axiosConfig
  )
  return data
}
