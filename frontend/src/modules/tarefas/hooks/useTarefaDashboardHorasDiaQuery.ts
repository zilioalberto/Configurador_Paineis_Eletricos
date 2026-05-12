import { useQuery } from '@tanstack/react-query'
import { obterDashboardHorasDia } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

export function useTarefaDashboardHorasDiaQuery(
  userId: number | string | undefined,
  data: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: tarefasQueryKeys.horasDia(userId ?? '', data),
    queryFn: () => obterDashboardHorasDia(data),
    enabled: enabled && userId != null && userId !== '',
    staleTime: 30_000,
  })
}
