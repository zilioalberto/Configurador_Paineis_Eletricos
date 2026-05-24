import { useQuery } from '@tanstack/react-query'
import { listarChecklistTarefa } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

/** Query de checklist de uma tarefa. */
export function useTarefaChecklistQuery(tarefaId: string | null) {
  return useQuery({
    queryKey: tarefasQueryKeys.checklist(tarefaId ?? ''),
    queryFn: () => listarChecklistTarefa(tarefaId ?? ''),
    enabled: Boolean(tarefaId),
    staleTime: 15_000,
  })
}
