import { useQuery } from '@tanstack/react-query'
import { cargaQueryKeys } from '../cargaQueryKeys'
import { listarCargas } from '../services/cargaService'

/** Lista cargas de um projeto (query param `projeto`). */
export function useCargaListQuery(projetoId: string | null) {
  return useQuery({
    queryKey: cargaQueryKeys.list(projetoId),
    queryFn: () => listarCargas(projetoId!),
    enabled: Boolean(projetoId),
  })
}
