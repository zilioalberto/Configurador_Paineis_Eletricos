import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { projetoPermiteEdicaoCargas } from '@/modules/configurador_paineis/cargas/utils/projetoEdicaoCargas'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'
import { ProjetoFluxoStepper } from '@/modules/configurador_paineis/projetos/components/ProjetoFluxoStepper'
import { useProjetoFluxoGates } from '@/modules/configurador_paineis/projetos/hooks/useProjetoFluxoGates'
import { useProjetoListQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { orcamentoDetalhePath } from '@/modules/orcamentos/utils/orcamentoUi'
import { sincronizarComposicaoPainel } from '@/modules/orcamentos/services/orcamentosApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { ComposicaoAlterarSugestaoModal } from '../components/ComposicaoAlterarSugestaoModal'
import { ComposicaoSeletorProjeto } from '../components/ComposicaoSeletorProjeto'
import { ComposicaoSnapshotContent } from '../components/ComposicaoSnapshotContent'
import { ComposicaoToolbarActions } from '../components/ComposicaoToolbarActions'
import { useAlternativasSugestaoQuery } from '../hooks/useAlternativasSugestaoQuery'
import { useComposicaoPageActions, useComposicaoProjetoChange } from '../hooks/useComposicaoPageActions'
import { useComposicaoSnapshotQuery } from '../hooks/useComposicaoSnapshotQuery'
import type { ComposicaoItem, SugestaoItem } from '../types/composicao'
import {
  agruparPorTagCarga,
  filtrarItensPorEtapaComposicao,
  isAcessorioBorneComposicao,
  itemPertenceEtapaComposicao,
} from '../utils/composicaoDisplay'

type ComposicaoExportFormat = 'pdf' | 'xlsx'

type ModalComposicaoState =
  | {
      title: string
      message: string
      confirmLabel: string
      isConfirming: boolean
      tipo: 'export' | 'reabrir'
    }
  | null

function modalComposicaoState(
  confirmExportFmt: ComposicaoExportFormat | null,
  exportando: ComposicaoExportFormat | null,
  itemReabrir: ComposicaoItem | null,
  reabrirPending: boolean
): ModalComposicaoState {
  if (confirmExportFmt !== null) {
    return {
      title: 'Existem pendências na composição',
      message:
        'Há pendências em aberto. O ideal é resolver todas antes de exportar. Deseja exportar mesmo assim?',
      confirmLabel: 'Exportar mesmo assim',
      isConfirming: exportando !== null,
      tipo: 'export',
    }
  }
  if (itemReabrir === null) return null
  return {
    title: 'Reabrir item aprovado?',
    message:
      'Este item sairá da composição aprovada e voltará para sugestões de itens, para você aprovar novamente ou alterar.',
    confirmLabel: 'Reabrir item',
    isConfirming: reabrirPending,
    tipo: 'reabrir',
  }
}

function statusSimNao(v: boolean): string {
  return v ? 'Sim' : 'Não'
}

function subtituloToolbarComposicao(
  projetoSelecionado: { readonly codigo: string; readonly nome: string } | null | undefined,
  composicaoFinal: boolean
): string {
  if (projetoSelecionado) return `${projetoSelecionado.codigo} · ${projetoSelecionado.nome}`
  if (composicaoFinal) {
    return 'Cabos, terminais, identificações, trilhos DIN, canaletas e acessórios'
  }
  return 'Sugestões, aprovações e pendências de materiais'
}

type FluxoGates = ReturnType<typeof useProjetoFluxoGates>

/** Calcula o motivo pelo qual a exportação para a proposta está bloqueada. */
function calcularMotivoBloqueioRetorno(
  sincronizando: boolean,
  pendenciasAbertas: number,
  sugestoesPendentes: number
): string {
  if (sincronizando) return 'Exportação para a proposta em andamento.'
  if (pendenciasAbertas > 0) return 'Resolva as pendências antes de exportar para a proposta.'
  if (sugestoesPendentes > 0) return 'Aprove todas as sugestões antes de exportar para a proposta.'
  return 'Conclua a composição antes de exportar para a proposta.'
}

/** Determina o destino de redirecionamento da etapa de composição, ou null. */
function redirecionamentoComposicao(
  projetoId: string,
  composicaoFinal: boolean,
  fluxoGates: FluxoGates
): string | null {
  if (!projetoId || fluxoGates.loading) return null
  if (!fluxoGates.temCargas) return configuradorPaths.cargas(projetoId)
  if (!fluxoGates.condutoresRevisaoOk) {
    return configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento')
  }
  if (composicaoFinal && !fluxoGates.podeAcessarComposicaoFinal) {
    return fluxoGates.podeAcessarDimensionamentoMecanico
      ? configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento_mecanico')
      : configuradorPaths.composicao(projetoId)
  }
  return null
}

type ComposicaoModalHandlersOptions = {
  modalComposicao: ModalComposicaoState
  confirmExportFmt: ComposicaoExportFormat | null
  setConfirmExportFmt: Dispatch<SetStateAction<ComposicaoExportFormat | null>>
  onReabrirItemAprovado: () => Promise<unknown>
  executarExportacao: (fmt: ComposicaoExportFormat) => Promise<unknown>
  orcamentoId: string
  vinculoId: string
  pendenciasAbertas: number
  sugestoesPendentes: number
  setSincronizandoOrcamento: Dispatch<SetStateAction<boolean>>
  showToast: ReturnType<typeof useToast>['showToast']
  navigate: ReturnType<typeof useNavigate>
}

/** Handlers de confirmação do modal e de retorno para a proposta. */
function useComposicaoModalHandlers(opts: ComposicaoModalHandlersOptions) {
  const {
    modalComposicao,
    confirmExportFmt,
    setConfirmExportFmt,
    onReabrirItemAprovado,
    executarExportacao,
    orcamentoId,
    vinculoId,
    pendenciasAbertas,
    sugestoesPendentes,
    setSincronizandoOrcamento,
    showToast,
    navigate,
  } = opts

  const confirmarModalComposicao = useCallback(() => {
    if (!modalComposicao) return
    if (modalComposicao.tipo === 'reabrir') {
      onReabrirItemAprovado().catch(() => undefined)
      return
    }
    if (!confirmExportFmt) return
    const fmt = confirmExportFmt
    setConfirmExportFmt(null)
    executarExportacao(fmt).catch(() => undefined)
  }, [confirmExportFmt, executarExportacao, modalComposicao, onReabrirItemAprovado, setConfirmExportFmt])

  const onRetornarOrcamento = useCallback(async () => {
    if (!orcamentoId || !vinculoId || pendenciasAbertas > 0 || sugestoesPendentes > 0) return
    try {
      setSincronizandoOrcamento(true)
      const resultado = await sincronizarComposicaoPainel(orcamentoId, vinculoId)
      showToast({
        variant: 'success',
        message: `${resultado.itens_sincronizados} item(ns) sincronizado(s) com a proposta.`,
      })
      navigate(orcamentoDetalhePath(orcamentoId))
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível exportar para a proposta',
        message: extrairMensagemErroApi(err) || 'Revise as pendências e tente novamente.',
      })
    } finally {
      setSincronizandoOrcamento(false)
    }
  }, [
    navigate,
    orcamentoId,
    pendenciasAbertas,
    setSincronizandoOrcamento,
    showToast,
    sugestoesPendentes,
    vinculoId,
  ])

  return { confirmarModalComposicao, onRetornarOrcamento }
}

function ComposicaoRetornoOrcamentoMonitor({
  orcamentoId,
  vinculoId,
  snapshotCarregado,
  pendenciasAbertas,
  sugestoesPendentes,
  sincronizandoOrcamento,
  botaoExportarHabilitado,
  motivoBloqueio,
}: Readonly<{
  orcamentoId: string
  vinculoId: string
  snapshotCarregado: boolean
  pendenciasAbertas: number
  sugestoesPendentes: number
  sincronizandoOrcamento: boolean
  botaoExportarHabilitado: boolean
  motivoBloqueio: string
}>) {
  return (
    <section className="border rounded bg-white p-3 mb-3" aria-label="Monitoramento da exportação para proposta">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="h6 mb-0">Monitoramento da exportação para proposta</h2>
        <span className={`badge ${botaoExportarHabilitado ? 'text-bg-success' : 'text-bg-warning'}`}>
          {botaoExportarHabilitado ? 'Habilitado' : 'Bloqueado'}
        </span>
      </div>
      <div className="row g-2">
        <div className="col-sm-6 col-lg-3">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-orcamento">
            Orçamento
          </label>
          <input id="comp-monitor-orcamento" className="form-control form-control-sm" value={orcamentoId} readOnly />
        </div>
        <div className="col-sm-6 col-lg-3">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-vinculo">
            Vínculo
          </label>
          <input id="comp-monitor-vinculo" className="form-control form-control-sm" value={vinculoId} readOnly />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-snapshot">
            Snapshot carregado
          </label>
          <input id="comp-monitor-snapshot" className="form-control form-control-sm" value={statusSimNao(snapshotCarregado)} readOnly />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-pendencias">
            Pendências
          </label>
          <input id="comp-monitor-pendencias" className="form-control form-control-sm" value={pendenciasAbertas} readOnly />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-sugestoes">
            Sugestões pendentes
          </label>
          <input id="comp-monitor-sugestoes" className="form-control form-control-sm" value={sugestoesPendentes} readOnly />
        </div>
        <div className="col-12 col-sm-6 col-lg-2">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-sincronizando">
            Sincronizando
          </label>
          <input id="comp-monitor-sincronizando" className="form-control form-control-sm" value={statusSimNao(sincronizandoOrcamento)} readOnly />
        </div>
        <div className="col-sm-6 col-lg-2">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-liberado">
            Pode exportar
          </label>
          <input id="comp-monitor-liberado" className="form-control form-control-sm" value={statusSimNao(botaoExportarHabilitado)} readOnly />
        </div>
        <div className="col-lg-8">
          <label className="form-label small text-muted mb-1" htmlFor="comp-monitor-motivo">
            Motivo
          </label>
          <input
            id="comp-monitor-motivo"
            className="form-control form-control-sm"
            value={botaoExportarHabilitado ? 'Pronto para exportar para a proposta.' : motivoBloqueio}
            readOnly
          />
        </div>
      </div>
    </section>
  )
}

/** Página principal da etapa de composição do painel (wizard passo 4). */
export default function ComposicaoPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const projetoId = searchParams.get('projeto') ?? ''
  const orcamentoId = searchParams.get('orcamento') ?? ''
  const vinculoId = searchParams.get('vinculo') ?? ''
  const etapaFluxo = searchParams.get('etapa') === 'composicao_final' ? 'composicao_final' : 'composicao'
  const composicaoFinal = etapaFluxo === 'composicao_final'
  const { showToast } = useToast()

  const [alterarSugestao, setAlterarSugestao] = useState<SugestaoItem | null>(null)
  const [alternativaSelecionadaId, setAlternativaSelecionadaId] = useState<string | null>(null)
  const [exportando, setExportando] = useState<ComposicaoExportFormat | null>(null)
  const [confirmExportFmt, setConfirmExportFmt] = useState<ComposicaoExportFormat | null>(null)
  const [aprovandoTodas, setAprovandoTodas] = useState(false)
  const [itemReabrir, setItemReabrir] = useState<ComposicaoItem | null>(null)
  const [sincronizandoOrcamento, setSincronizandoOrcamento] = useState(false)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const {
    data: snapshot,
    isPending: loadingSnap,
    isError,
    error: loadError,
  } = useComposicaoSnapshotQuery(projetoId || null)

  const { data: dimensionamento } = useDimensionamentoQuery(projetoId || null)
  const fluxoGates = useProjetoFluxoGates(projetoId || null)

  const projetoSelecionado = useMemo(
    () => (projetoId ? projetos.find((p) => p.id === projetoId) : undefined),
    [projetos, projetoId]
  )
  const canSepararMaterial = hasPermission(user, PERMISSION_KEYS.ALMOXARIFADO_SEPARAR_MATERIAL)
  const canEditarCatalogo = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const canViewCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA)
  const canViewDimensionamento = hasPermission(user, PERMISSION_KEYS.PROJETO_VISUALIZAR)
  const podeEditar = projetoPermiteEdicaoCargas(projetoSelecionado) && canSepararMaterial
  const filtrarSugestaoEtapaAtual = useCallback(
    (sugestao: SugestaoItem) => itemPertenceEtapaComposicao(sugestao, etapaFluxo),
    [etapaFluxo]
  )

  const actions = useComposicaoPageActions({
    projetoId,
    podeEditar,
    projetoSelecionado,
    snapshot,
    loadingSnap,
    isError,
    showToast,
    setAlterarSugestao,
    setConfirmExportFmt,
    setExportando,
    setAprovandoTodas,
    setItemReabrir,
    itemReabrir,
    autoGerarKey: etapaFluxo,
    filtrarSugestaoAprovar: filtrarSugestaoEtapaAtual,
  })

  const {
    autoGerando,
    reavaliarPendenciasMutation,
    aprovarMutation,
    reabrirComposicaoItemMutation,
    onReavaliarPendencias,
    onAprovar,
    onReabrirItemAprovado,
    onAprovarTodas,
    executarExportacao,
    onExportLista,
  } = actions

  const {
    data: alternativas = [],
    isPending: loadingAlternativas,
    isError: erroAlternativas,
    error: loadErroAlternativas,
  } = useAlternativasSugestaoQuery(alterarSugestao?.id ?? null, alterarSugestao != null)

  const abrirAlterarSugestao = useCallback((s: SugestaoItem) => {
    setAlterarSugestao(s)
    setAlternativaSelecionadaId(s.produto?.id ?? null)
  }, [])

  const onProjetoChange = useComposicaoProjetoChange(setSearchParams)

  const composicaoItens = useMemo(
    () => filtrarItensPorEtapaComposicao(snapshot?.composicao_itens ?? [], etapaFluxo),
    [etapaFluxo, snapshot?.composicao_itens]
  )
  const sugestoesEtapa = useMemo(
    () => filtrarItensPorEtapaComposicao(snapshot?.sugestoes ?? [], etapaFluxo),
    [etapaFluxo, snapshot?.sugestoes]
  )
  const pendenciasEtapa = useMemo(
    () => filtrarItensPorEtapaComposicao(snapshot?.pendencias ?? [], etapaFluxo),
    [etapaFluxo, snapshot?.pendencias]
  )
  const optsAgrupamento = useMemo(
    () => ({ correnteTotalPainelA: dimensionamento?.corrente_total_painel_a ?? null }),
    [dimensionamento?.corrente_total_painel_a]
  )
  const gruposComposicaoAprovada = useMemo(
    () => agruparPorTagCarga(composicaoItens, optsAgrupamento),
    [composicaoItens, optsAgrupamento]
  )
  const sugestoesPrincipais = useMemo(
    () => sugestoesEtapa.filter((s) => !isAcessorioBorneComposicao(s)),
    [sugestoesEtapa]
  )
  const sugestoesAcessoriosBornes = useMemo(
    () => sugestoesEtapa.filter(isAcessorioBorneComposicao),
    [sugestoesEtapa]
  )
  const gruposSugestoes = useMemo(
    () => agruparPorTagCarga(sugestoesPrincipais, optsAgrupamento),
    [sugestoesPrincipais, optsAgrupamento]
  )
  const gruposAcessoriosBornes = useMemo(
    () => agruparPorTagCarga(sugestoesAcessoriosBornes, optsAgrupamento),
    [sugestoesAcessoriosBornes, optsAgrupamento]
  )
  const gruposPendencias = useMemo(
    () => agruparPorTagCarga(pendenciasEtapa, optsAgrupamento),
    [pendenciasEtapa, optsAgrupamento]
  )
  const gruposMemorialCalculos = useMemo(() => {
    const comMemoria =
      sugestoesEtapa.filter((s) => (s.memoria_calculo ?? '').trim() !== '')
    return agruparPorTagCarga(comMemoria, optsAgrupamento)
  }, [sugestoesEtapa, optsAgrupamento])
  const pendenciasAbertas = pendenciasEtapa.length
  const sugestoesPendentes = sugestoesEtapa.length
  const fluxoVinculadoOrcamento = Boolean(orcamentoId && vinculoId)
  const composicaoAtualPath = composicaoFinal
    ? configuradorPaths.composicaoFinal(projetoId)
    : configuradorPaths.composicao(projetoId)
  const podeRetornarOrcamento = Boolean(
    orcamentoId && vinculoId && snapshot && pendenciasAbertas === 0 && sugestoesPendentes === 0
  )
  const botaoExportarPropostaHabilitado = podeRetornarOrcamento && !sincronizandoOrcamento
  const motivoBloqueioRetornoOrcamento = calcularMotivoBloqueioRetorno(
    sincronizandoOrcamento,
    pendenciasAbertas,
    sugestoesPendentes
  )

  const modalComposicao = useMemo(
    () =>
      modalComposicaoState(
        confirmExportFmt,
        exportando,
        itemReabrir,
        reabrirComposicaoItemMutation.isPending
      ),
    [confirmExportFmt, exportando, itemReabrir, reabrirComposicaoItemMutation.isPending]
  )

  const { confirmarModalComposicao, onRetornarOrcamento } = useComposicaoModalHandlers({
    modalComposicao,
    confirmExportFmt,
    setConfirmExportFmt,
    onReabrirItemAprovado,
    executarExportacao,
    orcamentoId,
    vinculoId,
    pendenciasAbertas,
    sugestoesPendentes,
    setSincronizandoOrcamento,
    showToast,
    navigate,
  })

  const toolbarActions = useMemo(
    () => (
      <ComposicaoToolbarActions
        projetoId={projetoId}
        composicaoAtualPath={composicaoAtualPath}
        searchParams={searchParams}
        composicaoFinal={composicaoFinal}
        podeAcessarDimensionamentoMecanico={fluxoGates.podeAcessarDimensionamentoMecanico}
        fluxoVinculadoOrcamento={fluxoVinculadoOrcamento}
        botaoExportarPropostaHabilitado={botaoExportarPropostaHabilitado}
        motivoBloqueioRetornoOrcamento={motivoBloqueioRetornoOrcamento}
        sincronizandoOrcamento={sincronizandoOrcamento}
        exportando={exportando}
        onRetornarOrcamento={onRetornarOrcamento}
        onExportLista={onExportLista}
      />
    ),
    [
      composicaoAtualPath,
      composicaoFinal,
      exportando,
      fluxoGates.podeAcessarDimensionamentoMecanico,
      onExportLista,
      onRetornarOrcamento,
      fluxoVinculadoOrcamento,
      botaoExportarPropostaHabilitado,
      motivoBloqueioRetornoOrcamento,
      projetoId,
      searchParams,
      sincronizandoOrcamento,
    ]
  )

  const toolbarConfig = useMemo(
    () => ({
      title: composicaoFinal ? 'Composição final do painel' : 'Composição do painel',
      subtitle: subtituloToolbarComposicao(projetoSelecionado, composicaoFinal),
      badges: undefined,
      actions: toolbarActions,
      actionsKey: [
        projetoId,
        etapaFluxo,
        fluxoVinculadoOrcamento ? 'proposta' : 'fluxo',
        botaoExportarPropostaHabilitado ? 'retorno-ok' : 'retorno-bloqueado',
        sincronizandoOrcamento ? 'sync' : 'idle',
        exportando ?? 'sem-export',
      ].join('|'),
    }),
    [
      botaoExportarPropostaHabilitado,
      composicaoItens.length,
      composicaoFinal,
      etapaFluxo,
      exportando,
      fluxoVinculadoOrcamento,
      pendenciasAbertas,
      podeRetornarOrcamento,
      projetoSelecionado,
      projetoId,
      snapshot,
      sincronizandoOrcamento,
      toolbarActions,
    ]
  )

  useAppPageToolbar(toolbarConfig)

  const destinoRedirecionamento = redirecionamentoComposicao(projetoId, composicaoFinal, fluxoGates)
  if (destinoRedirecionamento) {
    return <Navigate to={withFluxoOrigem(destinoRedirecionamento, searchParams)} replace />
  }

  return (
    <div className="container-fluid">
      {projetoId ? (
        <ProjetoFluxoStepper projetoId={projetoId} etapaAtual={etapaFluxo} compact />
      ) : null}

      <ConfirmModal
        show={modalComposicao !== null}
        title={modalComposicao?.title ?? ''}
        message={modalComposicao?.message ?? ''}
        confirmLabel={modalComposicao?.confirmLabel ?? 'Confirmar'}
        cancelLabel="Cancelar"
        confirmVariant="warning"
        isConfirming={modalComposicao?.isConfirming ?? false}
        onCancel={() => {
          setConfirmExportFmt(null)
          setItemReabrir(null)
        }}
        onConfirm={confirmarModalComposicao}
      />
      <ComposicaoSeletorProjeto
        projetoId={projetoId}
        projetos={projetos}
        loadingProjetos={loadingProjetos}
        onProjetoChange={onProjetoChange}
        canViewCargas={canViewCargas}
        canViewDimensionamento={canViewDimensionamento}
      />

      {!projetoId && (
        <p className="text-muted">Selecione um projeto para ver a composição sugerida.</p>
      )}

      {projetoId && !podeEditar && (
        <div className="alert alert-secondary" role="status">
          {projetoPermiteEdicaoCargas(projetoSelecionado)
            ? 'Seu utilizador tem acesso somente de visualização nesta etapa. A geração de sugestões e aprovações não estão disponíveis.'
            : 'Projeto finalizado: apenas visualização. A geração de sugestões e aprovações não estão disponíveis.'}
        </div>
      )}

      {fluxoVinculadoOrcamento ? (
        <ComposicaoRetornoOrcamentoMonitor
          orcamentoId={orcamentoId}
          vinculoId={vinculoId}
          snapshotCarregado={Boolean(snapshot)}
          pendenciasAbertas={pendenciasAbertas}
          sugestoesPendentes={sugestoesPendentes}
          sincronizandoOrcamento={sincronizandoOrcamento}
          botaoExportarHabilitado={botaoExportarPropostaHabilitado}
          motivoBloqueio={motivoBloqueioRetornoOrcamento}
        />
      ) : null}

      {projetoId && loadingSnap && <p className="text-muted mb-0">Carregando composição…</p>}

      {projetoId && !loadingSnap && isError && (
        <div className="alert alert-danger" role="alert">
          {loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar os dados.'}
        </div>
      )}

      {projetoId && !loadingSnap && !isError && snapshot ? (
        <ComposicaoSnapshotContent
          projetoId={projetoId}
          snapshot={snapshot}
          projetoSelecionado={projetoSelecionado}
          dimensionamento={dimensionamento}
          composicaoItens={composicaoItens}
          gruposComposicaoAprovada={gruposComposicaoAprovada}
          gruposSugestoes={gruposSugestoes}
          sugestoesPrincipaisCount={sugestoesPrincipais.length}
          sugestoesVisiveisCount={sugestoesEtapa.length}
          gruposAcessoriosBornes={gruposAcessoriosBornes}
          acessoriosBornesCount={sugestoesAcessoriosBornes.length}
          gruposPendencias={gruposPendencias}
          pendenciasVisiveisCount={pendenciasEtapa.length}
          gruposMemorialCalculos={gruposMemorialCalculos}
          podeEditar={podeEditar}
          canEditarCatalogo={canEditarCatalogo}
          canSepararMaterial={canSepararMaterial}
          autoGerando={autoGerando}
          aprovarPending={aprovarMutation.isPending}
          aprovandoTodas={aprovandoTodas}
          reabrirPending={reabrirComposicaoItemMutation.isPending}
          reavaliarPending={reavaliarPendenciasMutation.isPending}
          onReabrir={setItemReabrir}
          onAprovar={(id) => onAprovar(id, null)}
          onAlterar={abrirAlterarSugestao}
          onAprovarTodas={onAprovarTodas}
          onReavaliarPendencias={onReavaliarPendencias}
        />
      ) : null}

      {alterarSugestao ? (
        <ComposicaoAlterarSugestaoModal
          sugestao={alterarSugestao}
          alternativas={alternativas}
          loadingAlternativas={loadingAlternativas}
          erroAlternativas={erroAlternativas}
          loadErroAlternativas={loadErroAlternativas}
          alternativaSelecionadaId={alternativaSelecionadaId}
          setAlternativaSelecionadaId={setAlternativaSelecionadaId}
          aprovarPending={aprovarMutation.isPending}
          onClose={() => setAlterarSugestao(null)}
          onAprovar={(sid, pid) => onAprovar(sid, pid)}
        />
      ) : null}
    </div>
  )
}
