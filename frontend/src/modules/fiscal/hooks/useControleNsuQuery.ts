import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterControleNsu } from '../services/fiscalNfeService'

export function useControleNsuQuery(cnpj: string, enabled = true) {
  const digits = cnpj.replace(/\D/g, '')
  return useQuery({
    queryKey: fiscalQueryKeys.controleNsu(digits),
    queryFn: () => obterControleNsu(digits),
    enabled: enabled && digits.length === 14,
  })
}
