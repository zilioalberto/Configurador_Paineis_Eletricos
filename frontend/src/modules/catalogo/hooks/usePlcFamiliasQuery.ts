import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarPlcFamilias } from '../services/plcFamiliaService'

export function usePlcFamiliasQuery() {
  return useQuery({
    queryKey: catalogoQueryKeys.plcFamilias(),
    queryFn: listarPlcFamilias,
    staleTime: 60_000,
  })
}
