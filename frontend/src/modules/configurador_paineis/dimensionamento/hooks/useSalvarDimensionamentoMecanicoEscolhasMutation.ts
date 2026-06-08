import { useMutation, useQueryClient } from '@tanstack/react-query'

import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { salvarEscolhasDimensionamentoMecanico } from '../services/dimensionamentoService'
import type { PatchDimensionamentoMecanicoPayload } from '../types/dimensionamento'

export function useSalvarDimensionamentoMecanicoEscolhasMutation(projetoId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PatchDimensionamentoMecanicoPayload) =>
      salvarEscolhasDimensionamentoMecanico(projetoId!, payload),
    onSuccess: () => {
      if (!projetoId) return
      void qc.invalidateQueries({ queryKey: dimensionamentoQueryKeys.mecanico(projetoId) })
      void qc.invalidateQueries({ queryKey: dimensionamentoQueryKeys.porProjeto(projetoId) })
    },
  })
}
