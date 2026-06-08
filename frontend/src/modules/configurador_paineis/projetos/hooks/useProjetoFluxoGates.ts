import { useCargaListQuery } from '@/modules/configurador_paineis/cargas/hooks/useCargaListQuery'
import { useComposicaoSnapshotQuery } from '@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'

export type ProjetoFluxoEtapaId =
  | 'cargas'
  | 'dimensionamento'
  | 'composicao'
  | 'dimensionamento_mecanico'

/**
 * Pré-requisitos do fluxo linear: projeto → cargas → condutores → composição.
 */
export function useProjetoFluxoGates(projetoId: string | null | undefined) {
  const { data: cargas = [], isPending: loadingCargas } = useCargaListQuery(projetoId ?? null)
  const { data: dimensionamento, isPending: loadingDim } = useDimensionamentoQuery(projetoId ?? null)
  const { data: composicao, isPending: loadingComp } = useComposicaoSnapshotQuery(projetoId ?? null)

  const temCargas = cargas.length > 0
  const circuitos = dimensionamento?.circuitos_carga ?? []
  const ag = dimensionamento?.alimentacao_geral ?? null
  const todosCircuitosAprovados =
    circuitos.length > 0 && circuitos.every((c) => c.condutores_aprovado === true)
  const agAprovado = ag ? ag.condutores_aprovado === true : true
  const condutoresRevisaoOk =
    Boolean(dimensionamento?.condutores_revisao_confirmada) ||
    (todosCircuitosAprovados && agAprovado)

  const composicaoComItens = (composicao?.totais?.composicao_itens ?? 0) > 0

  return {
    loading: Boolean(projetoId) && (loadingCargas || loadingDim || loadingComp),
    temCargas,
    condutoresRevisaoOk,
    composicaoComItens,
    /** Etapa 2: exige ao menos uma carga. */
    podeAcessarDimensionamento: Boolean(projetoId) && temCargas,
    /** Etapa 3: exige revisão de condutores confirmada. */
    podeAcessarComposicao: Boolean(projetoId) && condutoresRevisaoOk,
    /** Etapa 4: exige itens aprovados na composição. */
    podeAcessarDimensionamentoMecanico: Boolean(projetoId) && composicaoComItens,
  }
}
