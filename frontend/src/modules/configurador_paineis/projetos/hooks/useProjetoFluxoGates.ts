<<<<<<< HEAD:frontend/src/modules/configurador_paineis/projetos/hooks/useProjetoFluxoGates.ts
import { useCargaListQuery } from '@/modules/configurador_paineis/cargas/hooks/useCargaListQuery'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'
=======
import { useCargaListQuery } from '@/modules/cargas/hooks/useCargaListQuery'
import { useDimensionamentoQuery } from '@/modules/dimensionamento/hooks/useDimensionamentoQuery'
>>>>>>> origin/main:frontend/src/modules/projetos/hooks/useProjetoFluxoGates.ts

export type ProjetoFluxoEtapaId = 'projeto' | 'cargas' | 'dimensionamento' | 'composicao'

/**
 * Pré-requisitos do fluxo linear: projeto → cargas → condutores → composição.
 */
export function useProjetoFluxoGates(projetoId: string | null | undefined) {
  const { data: cargas = [], isPending: loadingCargas } = useCargaListQuery(projetoId ?? null)
  const { data: dimensionamento, isPending: loadingDim } = useDimensionamentoQuery(projetoId ?? null)

  const temCargas = cargas.length > 0
  const condutoresRevisaoOk = Boolean(dimensionamento?.condutores_revisao_confirmada)

  return {
    loading: Boolean(projetoId) && (loadingCargas || loadingDim),
    temCargas,
    condutoresRevisaoOk,
    /** Etapa 3: exige ao menos uma carga. */
    podeAcessarDimensionamento: Boolean(projetoId) && temCargas,
    /** Etapa 4: exige revisão de condutores confirmada. */
    podeAcessarComposicao: Boolean(projetoId) && condutoresRevisaoOk,
  }
}
