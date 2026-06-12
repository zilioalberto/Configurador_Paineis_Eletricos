import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterNfeEmitida } from '../services/fiscalNfeService'

export function useNfeEmitidaDetailQuery(publicId: string, enabled = true) {
  return useQuery({
    queryKey: fiscalQueryKeys.nfeEmitida(publicId),
    queryFn: () => obterNfeEmitida(publicId),
    enabled: enabled && publicId.trim().length > 0,
  })
}
