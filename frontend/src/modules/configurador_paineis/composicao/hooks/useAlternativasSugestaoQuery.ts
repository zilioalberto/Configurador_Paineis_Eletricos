import { useQuery } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { listarAlternativasSugestao } from '../services/composicaoService'

/** Query lazy de alternativas de catálogo para uma sugestão. */
export function useAlternativasSugestaoQuery(
  sugestaoId: string | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: composicaoQueryKeys.alternativas(sugestaoId ?? ''),
    queryFn: () => listarAlternativasSugestao(sugestaoId!),
    enabled: Boolean(sugestaoId) && enabled,
  })
}
