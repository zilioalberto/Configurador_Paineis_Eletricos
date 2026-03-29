import { useQuery } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { listarAlternativasSugestao } from '../services/composicaoService'

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
