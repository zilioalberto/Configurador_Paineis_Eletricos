import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { patchCondutoresDimensionamento } from '../services/dimensionamentoService'
import type { PatchCondutoresPayload } from '../types/dimensionamento'

export function usePatchCondutoresDimensionamentoMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PatchCondutoresPayload) => {
      if (!projetoId) throw new Error('Projeto não selecionado.')
      return patchCondutoresDimensionamento(projetoId, payload)
    },
    onSuccess: (data) => {
      if (projetoId) {
        queryClient.setQueryData(dimensionamentoQueryKeys.porProjeto(projetoId), data)
      }
      void queryClient.invalidateQueries({ queryKey: dimensionamentoQueryKeys.all })
    },
  })
}
