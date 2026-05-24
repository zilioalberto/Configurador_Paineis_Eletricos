import { useQuery } from '@tanstack/react-query'
import { cargaQueryKeys } from '../cargaQueryKeys'
import { obterCarga } from '../services/cargaService'

/** Carrega detalhe de uma carga (blocos aninhados por tipo). */
export function useCargaDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: cargaQueryKeys.detail(id ?? ''),
    queryFn: () => obterCarga(id!),
    enabled: Boolean(id),
  })
}
