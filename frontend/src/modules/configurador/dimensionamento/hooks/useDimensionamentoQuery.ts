import { useQuery } from '@tanstack/react-query'
import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { obterDimensionamentoPorProjeto } from '../services/dimensionamentoService'

export function useDimensionamentoQuery(projetoId: string | null) {
  return useQuery({
    queryKey: dimensionamentoQueryKeys.porProjeto(projetoId ?? ''),
    queryFn: () => obterDimensionamentoPorProjeto(projetoId!),
    enabled: Boolean(projetoId),
  })
}
