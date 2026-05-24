import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { reabrirComposicaoItem } from '../services/composicaoService'

/** Mutation para reabrir item aprovado e devolvê-lo a sugestões. */
export function useReabrirComposicaoItemMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ composicaoItemId }: { composicaoItemId: string }) =>
      reabrirComposicaoItem(composicaoItemId),
    onSuccess: (data) => {
      if (projetoId && data.snapshot) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data.snapshot)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}
