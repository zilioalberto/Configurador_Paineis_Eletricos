import { useQuery } from '@tanstack/react-query'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarProjetos } from '../services/projetoService'

/** Carrega a listagem de projetos para tabelas e seletores. */
export function useProjetoListQuery() {
  return useQuery({
    queryKey: projetoQueryKeys.list(),
    queryFn: listarProjetos,
  })
}
