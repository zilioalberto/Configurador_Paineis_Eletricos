import { useQuery } from '@tanstack/react-query'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { obterTimerAtivoTarefa } from '../services/tarefasService'

export function useTarefaTimerAtivoQuery(enabled: boolean) {
  return useQuery({
    queryKey: tarefasQueryKeys.timerAtivo(),
    queryFn: obterTimerAtivoTarefa,
    enabled,
    staleTime: 10_000,
  })
}
