import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import {
  listarPlcFamilias,
  type ListarPlcFamiliasOptions,
} from '../services/plcFamiliaService'

/** Query de famílias de PLC (catálogo ou só tabela de especificação). */
export function usePlcFamiliasQuery(options?: ListarPlcFamiliasOptions) {
  return useQuery({
    queryKey: catalogoQueryKeys.plcFamilias(options?.apenasEspecificacaoPlc),
    queryFn: () => listarPlcFamilias(options),
    staleTime: 60_000,
  })
}
