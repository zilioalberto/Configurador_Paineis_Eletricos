import { useQuery } from '@tanstack/react-query'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { obterTimerAtivoTarefa } from '../services/tarefasService'
import type { TarefaTimerAtivoResponse } from '../types/tarefa'

/** Query do cronómetro ativo do usuário logado. */
export function useTarefaTimerAtivoQuery(enabled: boolean) {
  return useQuery({
    queryKey: tarefasQueryKeys.timerAtivo(),
    queryFn: obterTimerAtivoTarefa,
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const d = query.state.data as TarefaTimerAtivoResponse | undefined
      return d?.sessao ? 20_000 : false
    },
  })
}
