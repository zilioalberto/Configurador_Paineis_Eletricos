import { useQuery } from '@tanstack/react-query'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { listarResponsaveisTarefa } from '../services/tarefasService'

export function useTarefaResponsaveisQuery(enabled = true) {
  return useQuery({
    queryKey: tarefasQueryKeys.responsaveis(),
    queryFn: listarResponsaveisTarefa,
    enabled,
    staleTime: 5 * 60_000,
  })
}
