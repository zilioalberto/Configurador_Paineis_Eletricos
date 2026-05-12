import { useQuery } from '@tanstack/react-query'
import { listarHistoricoTarefa } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

export function useTarefaHistoricoQuery(tarefaId: string | null) {
  return useQuery({
    queryKey: tarefasQueryKeys.historico(tarefaId ?? ''),
    queryFn: () => listarHistoricoTarefa(tarefaId ?? ''),
    enabled: Boolean(tarefaId),
    staleTime: 15_000,
  })
}
