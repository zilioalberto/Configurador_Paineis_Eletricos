import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/configurador_paineis/dimensionamento/dimensionamentoQueryKeys'
import {
  adicionarInclusaoManual,
  removerInclusaoManual,
  type AdicionarInclusaoManualBody,
} from '../services/composicaoService'

/** Mutations de inclusão manual de produtos do catálogo na composição. */
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
      if (projetoId) {
        void queryClient.invalidateQueries({
          queryKey: dimensionamentoQueryKeys.mecanico(projetoId),
        })
      }
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
      if (projetoId) {
        void queryClient.invalidateQueries({
          queryKey: dimensionamentoQueryKeys.mecanico(projetoId),
        })
      }
    },
  })
}
