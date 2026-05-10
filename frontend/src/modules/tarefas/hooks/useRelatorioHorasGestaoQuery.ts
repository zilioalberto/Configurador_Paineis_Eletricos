import { useQuery } from '@tanstack/react-query'
import { obterRelatorioHorasGestao, type RelatorioHorasGestaoParams } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

export function useRelatorioHorasGestaoQuery(params: RelatorioHorasGestaoParams, enabled: boolean) {
  return useQuery({
    queryKey: tarefasQueryKeys.relatorioHorasGestao(params),
    queryFn: () => obterRelatorioHorasGestao(params),
    enabled,
    staleTime: 60_000,
  })
}
