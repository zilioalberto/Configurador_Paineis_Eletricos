import { useCallback, useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { useToast } from '@/components/feedback'
import { useGerarSugestoesMutation } from '@/modules/configurador_paineis/composicao/hooks/useGerarSugestoesMutation'
import { useReavaliarPendenciasMutation } from '@/modules/configurador_paineis/composicao/hooks/useReavaliarPendenciasMutation'
import { DimensionamentoWizardShell } from '@/modules/configurador_paineis/dimensionamento/components/DimensionamentoWizardShell'
import WizardCondutoresPanel from '@/modules/configurador_paineis/dimensionamento/components/WizardCondutoresPanel'
import WizardDimensionamentoMecanicoPanel from '@/modules/configurador_paineis/dimensionamento/components/WizardDimensionamentoMecanicoPanel'
import { useProjetoFluxoGates } from '../hooks/useProjetoFluxoGates'
import { useRecalcularDimensionamentoMutation } from '@/modules/configurador_paineis/dimensionamento/hooks/useRecalcularDimensionamentoMutation'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { ProjetoFluxoStepper } from '../components/ProjetoFluxoStepper'
import {
  ProjetoWizardAcoesRapidas,
  ProjetoWizardChecklistCard,
  ProjetoWizardHistoricoCard,
  ProjetoWizardResumoHeader,
  ProjetoWizardStepsGrid,
} from '../components/ProjetoWizardOverview'
import {
  ETAPAS_VALIDAS,
  useProjetoWizardFluxo,
  type WizardStepId,
} from '../hooks/useProjetoWizardFluxo'
import { withFluxoOrigem } from '../utils/fluxoOrigem'
import { configuradorPaths } from '../../configuradorPaths'

function toolbarDimensionamento(
  projetoId: string,
  searchParams: URLSearchParams,
  dimensionamentoEtapaConcluida: boolean,
  onSalvarIrSugestoes: () => void
) {
  const retornoDimensionamento = withFluxoOrigem(
    configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'),
    searchParams
  )
  const editarConfiguracaoPath = `${configuradorPaths.configuracaoEditar(projetoId)}?retorno=${encodeURIComponent(retornoDimensionamento)}`

  return {
    title: 'Dimensionamento de condutores',
    subtitle: undefined,
    actions: (
      <>
        <Link to={editarConfiguracaoPath} className="btn btn-outline-light btn-sm">
          Editar configurações
        </Link>
        <Link
          to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)}
          className="btn btn-outline-light btn-sm"
        >
          Editar cargas
        </Link>
      </>
    ),
    primaryAction: {
      label: 'Salvar e ir para sugestões',
      disabled: !dimensionamentoEtapaConcluida,
      onClick: onSalvarIrSugestoes,
    },
  }
}

function toolbarDimensionamentoMecanico(
  projetoId: string,
  searchParams: URLSearchParams,
  projeto: { codigo?: string; nome?: string } | null | undefined
) {
  return {
    title: 'Dimensionamento mecânico',
    subtitle: projeto?.nome ? `${projeto.codigo} · ${projeto.nome}` : undefined,
    actions: (
      <Link
        to={withFluxoOrigem(configuradorPaths.composicaoFinal(projetoId), searchParams)}
        className="btn btn-success btn-sm"
      >
        Ir para composição final
      </Link>
    ),
  }
}

/**
 * Shell do wizard por etapa (`/projetos/:id/fluxo/:etapa`):
 * overview, dimensionamento embutido ou redirecionamentos para cargas/composição.
 */
export default function ProjetoWizardPage() {
  const { id, etapa } = useParams<{ id: string; etapa: string }>()
  const projetoId = id ?? ''
  const etapaParam = etapa ?? ''
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const etapaInvalidaNaUrl = Boolean(etapaParam) && !ETAPAS_VALIDAS.includes(etapaParam as WizardStepId)
  const etapaAtual: WizardStepId = ETAPAS_VALIDAS.includes(etapaParam as WizardStepId)
    ? (etapaParam as WizardStepId)
    : 'cargas'

  const { showToast } = useToast()
  const fluxo = useProjetoWizardFluxo(projetoId)
  const gates = useProjetoFluxoGates(projetoId)
  const {
    projeto,
    loadingProjeto,
    loadingCargas,
    cargas,
    dimensionamento,
    composicao,
    historico,
    temCargas,
    dimensionamentoEtapaConcluida,
    prontoParaExportar,
    ultimaAcaoComUsuarioIdentificado,
    ultimoEvento,
    checklist,
    steps,
  } = fluxo

  const recalcMutation = useRecalcularDimensionamentoMutation(projetoId || null)
  const gerarMutation = useGerarSugestoesMutation(projetoId || null)
  const reavaliarMutation = useReavaliarPendenciasMutation(projetoId || null)

  const etapaIndex = steps.findIndex((s) => s.id === etapaAtual)
  const proxima = etapaIndex >= 0 ? steps.slice(etapaIndex).find((s) => !s.done && s.canEnter) : null
  const onSalvarIrSugestoes = useCallback(() => {
    navigate(withFluxoOrigem(configuradorPaths.composicao(projetoId), searchParams))
  }, [navigate, projetoId, searchParams])

  const toolbarConfig = useMemo(() => {
    if (etapaAtual === 'dimensionamento') {
      return toolbarDimensionamento(
        projetoId,
        searchParams,
        dimensionamentoEtapaConcluida,
        onSalvarIrSugestoes
      )
    }

    if (etapaAtual === 'dimensionamento_mecanico') {
      return toolbarDimensionamentoMecanico(projetoId, searchParams, projeto)
    }

    return null
  }, [
    dimensionamentoEtapaConcluida,
    etapaAtual,
    onSalvarIrSugestoes,
    projeto,
    projetoId,
    searchParams,
  ])

  useAppPageToolbar(toolbarConfig)

  const onRecalcular = useCallback(async () => {
    try {
      await recalcMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Dimensionamento recalculado no wizard.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao recalcular',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [recalcMutation, showToast])

  const onGerarSugestoes = useCallback(async () => {
    try {
      const data = await gerarMutation.mutateAsync(true)
      const erros = data.geracao?.erros_etapas ?? []
      showToast({
        variant: erros.length > 0 ? 'warning' : 'success',
        message:
          erros.length > 0
            ? 'Composição gerada com avisos. Revise as pendências.'
            : 'Sugestões de composição geradas com sucesso.',
      })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao gerar composição',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [gerarMutation, showToast])

  const onReavaliarPendencias = useCallback(async () => {
    try {
      await reavaliarMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Pendências reavaliadas no wizard.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Falha ao reavaliar pendências',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [reavaliarMutation, showToast])

  if (!id) {
    return <Navigate to={configuradorPaths.configuracoes} replace />
  }

  if (etapaInvalidaNaUrl) {
    return <Navigate to={withFluxoOrigem(configuradorPaths.configuracaoFluxo(projetoId, 'cargas'), searchParams)} replace />
  }

  if (etapaAtual === 'composicao') {
    return <Navigate to={withFluxoOrigem(configuradorPaths.composicao(projetoId), searchParams)} replace />
  }

  if (etapaAtual === 'composicao_final') {
    return <Navigate to={withFluxoOrigem(configuradorPaths.composicaoFinal(projetoId), searchParams)} replace />
  }

  if (etapaAtual === 'dimensionamento' && !loadingCargas && !temCargas) {
    return <Navigate to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)} replace />
  }

  if (
    etapaAtual === 'dimensionamento_mecanico' &&
    !gates.loading &&
    !gates.podeAcessarDimensionamentoMecanico
  ) {
    return (
      <Navigate
        to={withFluxoOrigem(configuradorPaths.composicao(projetoId), searchParams)}
        replace
      />
    )
  }

  const mostrarOverviewCards =
    etapaAtual !== 'dimensionamento' && etapaAtual !== 'dimensionamento_mecanico'
  const mostrarStepper = etapaAtual !== 'dimensionamento'

  return (
    <div className="container-fluid">
      {mostrarStepper ? (
        <ProjetoFluxoStepper projetoId={projetoId} etapaAtual={etapaAtual} />
      ) : null}

      {mostrarOverviewCards ? (
        <ProjetoWizardResumoHeader
          projetoId={projetoId}
          projeto={projeto}
          ultimoEvento={ultimoEvento}
          ultimaAcaoComUsuarioIdentificado={ultimaAcaoComUsuarioIdentificado}
          proxima={proxima}
        />
      ) : null}

      {loadingProjeto ? <p className="text-muted">Carregando projeto...</p> : null}

      {etapaAtual === 'dimensionamento' ? (
        <DimensionamentoWizardShell
          projetoId={projetoId}
          projetoNome={projeto?.nome}
          temCargas={temCargas}
        >
          {temCargas ? (
            <WizardCondutoresPanel projetoId={projetoId} embedded />
          ) : (
            <div className="alert alert-info mb-0" role="status">
              <p className="mb-2">
                Cadastre ao menos uma carga ativa para calcular e revisar as bitolas dos circuitos.
              </p>
              <Link
                className="btn btn-sm btn-outline-primary"
                to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)}
              >
                Gerenciar cargas
              </Link>
            </div>
          )}
        </DimensionamentoWizardShell>
      ) : null}

      {etapaAtual === 'dimensionamento_mecanico' ? (
        <WizardDimensionamentoMecanicoPanel projetoId={projetoId} embedded />
      ) : null}

      {mostrarOverviewCards ? (
        <>
          <ProjetoWizardStepsGrid steps={steps} etapaAtual={etapaAtual} />
          <ProjetoWizardAcoesRapidas
            projetoId={projetoId}
            cargas={cargas}
            temCargas={temCargas}
            dimensionamento={dimensionamento}
            dimensionamentoEtapaConcluida={dimensionamentoEtapaConcluida}
            composicao={composicao}
            recalcPending={recalcMutation.isPending}
            gerarPending={gerarMutation.isPending}
            reavaliarPending={reavaliarMutation.isPending}
            onRecalcular={onRecalcular}
            onGerarSugestoes={onGerarSugestoes}
            onReavaliarPendencias={onReavaliarPendencias}
          />
          <ProjetoWizardChecklistCard
            checklist={checklist}
            projetoId={projetoId}
            prontoParaExportar={prontoParaExportar}
          />
          <ProjetoWizardHistoricoCard historico={historico} />
        </>
      ) : null}
    </div>
  )
}
