import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import {
  listarPlcFamilias,
  type ListarPlcFamiliasOptions,
} from '../services/plcFamiliaService'

export function usePlcFamiliasQuery(options?: ListarPlcFamiliasOptions) {
  return useQuery({
    queryKey: catalogoQueryKeys.plcFamilias(options?.apenasEspecificacaoPlc),
    queryFn: () => listarPlcFamilias(options),
    staleTime: 60_000,
  })
}
