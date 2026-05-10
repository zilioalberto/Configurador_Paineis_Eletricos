import { useQuery } from '@tanstack/react-query'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { obterKanbanTarefas } from '../services/tarefasService'

/** `quadroId`: UUID do quadro (query `?quadro=` na API). Omitir usa o primeiro quadro visível. */
export function useKanbanTarefasQuery(quadroId?: string | null) {
  return useQuery({
    queryKey: tarefasQueryKeys.kanban(quadroId),
    queryFn: () => obterKanbanTarefas(quadroId),
    staleTime: 30_000,
  })
}
