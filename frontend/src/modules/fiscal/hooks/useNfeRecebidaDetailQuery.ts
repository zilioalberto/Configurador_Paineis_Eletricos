import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterNfeRecebida } from '../services/fiscalNfeService'

export function useNfeRecebidaDetailQuery(id: number, enabled = true) {
  return useQuery({
    queryKey: fiscalQueryKeys.nfeRecebida(id),
    queryFn: () => obterNfeRecebida(id),
    enabled: enabled && id > 0,
  })
}
