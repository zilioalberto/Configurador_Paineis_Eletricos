import { useQuery } from '@tanstack/react-query'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { listarItensFiscais } from '../services/fiscalService'

/** Hook React Query para listagem paginada de itens fiscais. */
export function useItensFiscaisListQuery(search: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: fiscalQueryKeys.itensFiscais(search, page, pageSize),
    queryFn: () => listarItensFiscais(search, page, pageSize),
  })
}
