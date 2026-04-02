import { useQuery } from '@tanstack/react-query'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { obterProjeto } from '../services/projetoService'

export function useProjetoDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: projetoQueryKeys.detail(id ?? ''),
    queryFn: () => obterProjeto(id!),
    enabled: Boolean(id),
  })
}
