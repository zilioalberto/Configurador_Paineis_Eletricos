import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import {
  adicionarInclusaoManual,
  removerInclusaoManual,
  type AdicionarInclusaoManualBody,
} from '../services/composicaoService'

export function useAdicionarInclusaoManualMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AdicionarInclusaoManualBody) => {
      if (!projetoId) throw new Error('projetoId ausente')
      return adicionarInclusaoManual(projetoId, body)
    },
    onSuccess: (data) => {
      if (projetoId && data.snapshot) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data.snapshot)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}

export function useRemoverInclusaoManualMutation(projetoId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inclusaoId: string) => removerInclusaoManual(inclusaoId),
    onSuccess: (data) => {
      if (projetoId && data.snapshot) {
        queryClient.setQueryData(composicaoQueryKeys.snapshot(projetoId), data.snapshot)
      }
      void queryClient.invalidateQueries({ queryKey: composicaoQueryKeys.all })
    },
  })
}
