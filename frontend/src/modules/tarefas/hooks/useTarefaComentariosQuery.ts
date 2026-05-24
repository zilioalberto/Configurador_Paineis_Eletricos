import { useQuery } from '@tanstack/react-query'
import { listarComentariosTarefa } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

/** Query de comentários de uma tarefa. */
export function useTarefaComentariosQuery(tarefaId: string | null) {
  return useQuery({
    queryKey: tarefasQueryKeys.comentarios(tarefaId ?? ''),
    queryFn: () => listarComentariosTarefa(tarefaId ?? ''),
    enabled: Boolean(tarefaId),
    staleTime: 15_000,
  })
}
