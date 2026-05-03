import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { gerarSugestoesComposicao } from '../services/composicaoService'

export function useGerarSugestoesMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (limparAntes?: boolean) => {
      if (!projetoId) throw new Error('Projeto não selecionado.')
      return gerarSugestoesComposicao(projetoId, limparAntes ?? true)
    },
    onSuccess: (data) => {
      if (projetoId) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}
