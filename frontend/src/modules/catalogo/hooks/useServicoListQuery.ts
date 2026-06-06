import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarServicos } from '../services/servicoService'

export function useServicoListQuery(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: catalogoQueryKeys.servicos(page, pageSize),
    queryFn: () => listarServicos(page, pageSize),
  })
}
