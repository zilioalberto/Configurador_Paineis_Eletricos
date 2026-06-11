import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterProjecaoDasSimples } from '../services/fiscalSimplesService'

export function useProjecaoDasSimplesQuery(competencia: string) {
  return useQuery({
    queryKey: fiscalQueryKeys.simplesProjecao(competencia),
    queryFn: () => obterProjecaoDasSimples(competencia),
    enabled: Boolean(competencia),
  })
}
