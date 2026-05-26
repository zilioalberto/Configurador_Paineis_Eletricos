import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { obterServico } from '../services/servicoService'

export function useServicoDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: catalogoQueryKeys.servico(id ?? ''),
    queryFn: () => obterServico(id!),
    enabled: Boolean(id),
  })
}
