import { useQuery } from '@tanstack/react-query'

import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { obterDimensionamentoMecanico } from '../services/dimensionamentoService'

export function useDimensionamentoMecanicoQuery(projetoId: string | null) {
  return useQuery({
    queryKey: dimensionamentoQueryKeys.mecanico(projetoId ?? ''),
    queryFn: () => obterDimensionamentoMecanico(projetoId!),
    enabled: Boolean(projetoId),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
