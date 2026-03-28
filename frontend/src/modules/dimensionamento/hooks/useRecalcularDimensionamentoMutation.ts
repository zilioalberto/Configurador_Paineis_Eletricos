import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { recalcularDimensionamento } from '../services/dimensionamentoService'

export function useRecalcularDimensionamentoMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!projetoId) throw new Error('Projeto não selecionado.')
      return recalcularDimensionamento(projetoId)
    },
    onSuccess: (data) => {
      if (projetoId) {
        queryClient.setQueryData(dimensionamentoQueryKeys.porProjeto(projetoId), data)
      }
      void queryClient.invalidateQueries({ queryKey: dimensionamentoQueryKeys.all })
    },
  })
}
