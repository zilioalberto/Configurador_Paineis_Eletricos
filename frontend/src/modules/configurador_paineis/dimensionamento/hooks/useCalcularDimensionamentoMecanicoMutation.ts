import { useMutation, useQueryClient } from '@tanstack/react-query'

import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { calcularDimensionamentoMecanico } from '../services/dimensionamentoService'

export function useCalcularDimensionamentoMecanicoMutation(projetoId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calcularDimensionamentoMecanico(projetoId!),
    onSuccess: () => {
      if (!projetoId) return
      void qc.invalidateQueries({ queryKey: dimensionamentoQueryKeys.mecanico(projetoId) })
      void qc.invalidateQueries({ queryKey: dimensionamentoQueryKeys.porProjeto(projetoId) })
    },
  })
}
