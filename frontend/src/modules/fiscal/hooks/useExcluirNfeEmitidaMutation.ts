import { useMutation, useQueryClient } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { excluirDocumentoEmitido } from '../services/fiscalNfeService'

/** Exclui NF-e/NFS-e emitida importada e invalida caches do módulo fiscal. */
export function useExcluirNfeEmitidaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (publicId: string) => excluirDocumentoEmitido(publicId),
    onSuccess: (_, publicId) => {
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.all })
      queryClient.removeQueries({ queryKey: fiscalQueryKeys.nfeEmitida(publicId) })
    },
  })
}
