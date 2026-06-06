import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterFiscalModuloConfig } from '../services/fiscalConfigService'

export function useFiscalConfigQuery() {
  return useQuery({
    queryKey: fiscalQueryKeys.config,
    queryFn: obterFiscalModuloConfig,
    staleTime: 5 * 60 * 1000,
  })
}
