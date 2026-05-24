import { useQuery } from '@tanstack/react-query'
import { obterRelatorioHorasGestao, type RelatorioHorasGestaoParams } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

/** Query do relatório de gestão de horas por período. */
export function useRelatorioHorasGestaoQuery(params: RelatorioHorasGestaoParams, enabled: boolean) {
  return useQuery({
    queryKey: tarefasQueryKeys.relatorioHorasGestao(params),
    queryFn: () => obterRelatorioHorasGestao(params),
    enabled,
    staleTime: 60_000,
  })
}
