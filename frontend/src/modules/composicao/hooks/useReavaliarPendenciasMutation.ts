import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { reavaliarPendenciasComposicao } from '../services/composicaoService'

export function useReavaliarPendenciasMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!projetoId) throw new Error('Projeto não selecionado.')
      return reavaliarPendenciasComposicao(projetoId)
    },
    onSuccess: (data) => {
      if (projetoId) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}
