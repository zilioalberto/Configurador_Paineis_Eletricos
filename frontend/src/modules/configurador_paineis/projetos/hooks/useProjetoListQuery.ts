import { useQuery } from '@tanstack/react-query'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarProjetos } from '../services/projetoService'

export function useProjetoListQuery() {
  return useQuery({
    queryKey: projetoQueryKeys.list(),
    queryFn: listarProjetos,
  })
}
