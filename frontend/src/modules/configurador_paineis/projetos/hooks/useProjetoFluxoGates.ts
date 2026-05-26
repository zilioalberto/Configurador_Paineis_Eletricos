import { useCargaListQuery } from '@/modules/configurador_paineis/cargas/hooks/useCargaListQuery'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'

export type ProjetoFluxoEtapaId = 'cargas' | 'dimensionamento' | 'composicao'

/**
 * Pré-requisitos do fluxo linear: projeto → cargas → condutores → composição.
 */
export function useProjetoFluxoGates(projetoId: string | null | undefined) {
  const { data: cargas = [], isPending: loadingCargas } = useCargaListQuery(projetoId ?? null)
  const { data: dimensionamento, isPending: loadingDim } = useDimensionamentoQuery(projetoId ?? null)

  const temCargas = cargas.length > 0
  const circuitos = dimensionamento?.circuitos_carga ?? []
  const ag = dimensionamento?.alimentacao_geral ?? null
  const todosCircuitosAprovados =
    circuitos.length > 0 && circuitos.every((c) => c.condutores_aprovado === true)
  const agAprovado = ag ? ag.condutores_aprovado === true : true
  const condutoresRevisaoOk =
    Boolean(dimensionamento?.condutores_revisao_confirmada) ||
    (todosCircuitosAprovados && agAprovado)

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
