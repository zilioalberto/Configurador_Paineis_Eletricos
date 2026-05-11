import { useQuery } from '@tanstack/react-query'
import { listarApontamentosTarefa } from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'

export function useTarefaApontamentosQuery(tarefaId: string | null) {
  return useQuery({
    queryKey: tarefasQueryKeys.apontamentos(tarefaId ?? ''),
    queryFn: () => listarApontamentosTarefa(tarefaId ?? ''),
    enabled: Boolean(tarefaId),
    staleTime: 15_000,
  })
}
