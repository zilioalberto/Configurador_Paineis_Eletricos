import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterNfseRecebida } from '../services/fiscalNfseRecebidaService'

export function useNfseRecebidaDetailQuery(publicId: string, enabled = true) {
  const id = publicId.trim()
  return useQuery({
    queryKey: fiscalQueryKeys.nfseRecebida(id),
    queryFn: () => obterNfseRecebida(id),
    enabled: enabled && id.length > 0,
  })
}
