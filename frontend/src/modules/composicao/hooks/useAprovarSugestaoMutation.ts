import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { aprovarSugestao } from '../services/composicaoService'

export function useAprovarSugestaoMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sugestaoId,
      produtoId,
    }: {
      sugestaoId: string
      produtoId?: string | null
    }) => aprovarSugestao(sugestaoId, produtoId),
    onSuccess: (data) => {
      if (projetoId && data.snapshot) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data.snapshot)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}
