/** Painel principal de revisão/aprovação de bitolas (modo embutido no wizard). */

import { useWizardCondutoresPanel } from '../hooks/useWizardCondutoresPanel'
import {
  AlimentacaoGeralSection,
  CorrentesPorFasePainelSection,
  WizardCondutoresCircuitosBlock,
  WizardCondutoresToolbar,
} from './WizardCondutoresSections'

type Props = Readonly<{
  projetoId: string
  /** Sem cartão azul nem título duplicado — usar com `DimensionamentoWizardShell`. */
  embedded?: boolean
}>

export default function WizardCondutoresPanel({ projetoId, embedded = false }: Props) {
  const panel = useWizardCondutoresPanel(projetoId)
  const {
    dim,
    isPending,
    isError,
    error,
    patchMut,
    tabela,
    circuitos,
    ag,
    agOv,
    setAgOv,
    circuitoOv,
    setCircuitoOv,
    canEditar,
    ibPainel,
    circuitosPendentes,
    circuitosAprovadosLista,
    agAprovado,
    revisaoEfetivaOk,
    podeAprovarTodas,
    bloquearEdicao,
    onAprovarCircuito,
    onRevisarCircuito,
    onUsarSugestaoCircuito,
    onAprovarAlimentacao,
    onRevisarAlimentacao,
    onUsarSugestaoAlimentacao,
    onAprovarTodas,
    onRestaurarSugestoes,
  } = panel

  if (isPending) {
    return <p className="text-muted mb-0">Carregando dimensionamento de condutores...</p>
  }
  if (isError) {
    return (
      <div className="alert alert-danger" role="alert">
        {error instanceof Error ? error.message : 'Não foi possível carregar o dimensionamento.'}
      </div>
    )
  }
  if (!dim) {
    return <p className="text-muted mb-0">Sem dados de dimensionamento.</p>
  }

  const panelSlice = {
    canEditar,
    patchPending: patchMut.isPending,
    bloquearEdicao,
  }

  const circuitoActions = {
    onRevisar: onRevisarCircuito,
    onUsarSugestao: onUsarSugestaoCircuito,
    onAprovar: onAprovarCircuito,
  }

  const body = (
    <>
      <WizardCondutoresToolbar
        embedded={embedded}
        podeAprovarTodas={podeAprovarTodas}
        patchPending={patchMut.isPending}
        canEditar={canEditar}
        onAprovarTodas={onAprovarTodas}
      />

      <WizardCondutoresCircuitosBlock
        circuitos={circuitos}
        aprovados={circuitosAprovadosLista}
        pendentes={circuitosPendentes}
        tabela={tabela}
        circuitoOv={circuitoOv}
        setCircuitoOv={setCircuitoOv}
        panel={panelSlice}
        actions={circuitoActions}
        revisaoEfetivaOk={revisaoEfetivaOk}
      />

      <CorrentesPorFasePainelSection
        correntes={dim.correntes_por_fase_painel_a}
        correnteTotalReferencia={dim.corrente_total_painel_a}
        aplicaFatorDemandaSeccionamento={dim.aplica_fator_demanda_seccionamento}
      />

      {ag && agOv ? (
        <AlimentacaoGeralSection
          ag={ag}
          agOv={agOv}
          setAgOv={setAgOv}
          agAprovado={agAprovado}
          tabela={tabela}
          ibPainel={ibPainel}
          panel={panelSlice}
          onRevisar={onRevisarAlimentacao}
          onUsarSugestao={onUsarSugestaoAlimentacao}
          onAprovar={onAprovarAlimentacao}
        />
      ) : null}

      <div className="d-flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          className={`btn btn-outline-secondary ${embedded ? '' : 'btn-sm'}`}
          disabled={!canEditar || patchMut.isPending || revisaoEfetivaOk}
          onClick={onRestaurarSugestoes}
        >
          Usar apenas sugestões do sistema (todas as linhas)
        </button>
      </div>
    </>
  )

  if (embedded) {
    return <div className="dimensionamento-condutores-embed">{body}</div>
  }

  return (
    <div className="card border-primary mb-4">
      <div className="card-body">{body}</div>
    </div>
  )
}
