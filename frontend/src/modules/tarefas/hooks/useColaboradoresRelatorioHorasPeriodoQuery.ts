import { useQuery } from '@tanstack/react-query'

import { tarefasQueryKeys } from '../tarefasQueryKeys'
import {
  listarColaboradoresRelatorioHorasPeriodo,
  type ColaboradoresRelatorioHorasPeriodoParams,
} from '../services/tarefasService'

function periodoDatasValidas(dataInicio: string, dataFim: string): boolean {
  if (!dataInicio || !dataFim) return false
  return dataInicio <= dataFim
}

export function useColaboradoresRelatorioHorasPeriodoQuery(
  params: ColaboradoresRelatorioHorasPeriodoParams,
  enabled: boolean
) {
  const ok = enabled && periodoDatasValidas(params.data_inicio, params.data_fim)
  return useQuery({
    queryKey: tarefasQueryKeys.relatorioHorasGestaoColaboradores(params),
    queryFn: () => listarColaboradoresRelatorioHorasPeriodo(params),
    enabled: ok,
    staleTime: 60_000,
  })
}
