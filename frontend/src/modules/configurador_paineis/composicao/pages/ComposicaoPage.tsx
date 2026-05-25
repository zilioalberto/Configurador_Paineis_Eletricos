import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
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
import { sincronizarComposicaoPainel } from '@/modules/erp/services/erpApi'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { ComposicaoAlterarSugestaoModal } from '../components/ComposicaoAlterarSugestaoModal'
import { ComposicaoSnapshotContent } from '../components/ComposicaoSnapshotContent'
import { useAlternativasSugestaoQuery } from '../hooks/useAlternativasSugestaoQuery'
import { useComposicaoPageActions, useComposicaoProjetoChange } from '../hooks/useComposicaoPageActions'
import { useComposicaoSnapshotQuery } from '../hooks/useComposicaoSnapshotQuery'
import type { ComposicaoItem, SugestaoItem } from '../types/composicao'
import { agruparPorTagCarga } from '../utils/composicaoDisplay'

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

/** Página principal da etapa de composição do painel (wizard passo 4). */
export default function ComposicaoPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const projetoId = searchParams.get('projeto') ?? ''
  const orcamentoId = searchParams.get('orcamento') ?? ''
  const vinculoId = searchParams.get('vinculo') ?? ''
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
  })

  const {
    autoGerando,
    gerandoSugestoes,
    reavaliarPendenciasMutation,
    aprovarMutation,
    reabrirComposicaoItemMutation,
    onGerar,
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

  const composicaoItens = useMemo(() => snapshot?.composicao_itens ?? [], [snapshot?.composicao_itens])
  const optsAgrupamento = useMemo(
    () => ({ correnteTotalPainelA: dimensionamento?.corrente_total_painel_a ?? null }),
    [dimensionamento?.corrente_total_painel_a]
  )
  const gruposComposicaoAprovada = useMemo(
    () => agruparPorTagCarga(composicaoItens, optsAgrupamento),
    [composicaoItens, optsAgrupamento]
  )
  const gruposSugestoes = useMemo(
    () => agruparPorTagCarga(snapshot?.sugestoes ?? [], optsAgrupamento),
    [snapshot?.sugestoes, optsAgrupamento]
  )
  const gruposPendencias = useMemo(
    () => agruparPorTagCarga(snapshot?.pendencias ?? [], optsAgrupamento),
    [snapshot?.pendencias, optsAgrupamento]
  )
  const gruposMemorialCalculos = useMemo(() => {
    const comMemoria =
      snapshot?.sugestoes.filter((s) => (s.memoria_calculo ?? '').trim() !== '') ?? []
    return agruparPorTagCarga(comMemoria, optsAgrupamento)
  }, [snapshot?.sugestoes, optsAgrupamento])
  const pendenciasAbertas = snapshot?.totais.pendencias ?? snapshot?.pendencias.length ?? 0
  const podeRetornarOrcamento = Boolean(orcamentoId && vinculoId && snapshot && pendenciasAbertas === 0)

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
  }, [confirmExportFmt, executarExportacao, modalComposicao, onReabrirItemAprovado])

  const onRetornarOrcamento = useCallback(async () => {
    if (!orcamentoId || !vinculoId || pendenciasAbertas > 0) return
    try {
      setSincronizandoOrcamento(true)
      const resultado = await sincronizarComposicaoPainel(orcamentoId, vinculoId)
      showToast({
        variant: 'success',
        message: `${resultado.itens_sincronizados} item(ns) sincronizado(s) com a proposta.`,
      })
      navigate(`/erp/orcamentos/${orcamentoId}`)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível retornar à proposta',
        message: extrairMensagemErroApi(err) || 'Revise as pendências e tente novamente.',
      })
    } finally {
      setSincronizandoOrcamento(false)
    }
  }, [navigate, orcamentoId, pendenciasAbertas, showToast, vinculoId])

  if (projetoId && !fluxoGates.loading && !fluxoGates.temCargas) {
    return <Navigate to={withFluxoOrigem(configuradorPaths.cargas(projetoId), searchParams)} replace />
  }
  if (projetoId && !fluxoGates.loading && fluxoGates.temCargas && !fluxoGates.condutoresRevisaoOk) {
    return (
      <Navigate to={withFluxoOrigem(configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'), searchParams)} replace />
    )
  }

  return (
    <div className="container-fluid">
      {projetoId ? (
        <ProjetoFluxoStepper projetoId={projetoId} etapaAtual="composicao" compact />
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Composição do painel</h1>
          <p className="text-muted mb-0">
            Sugestões automáticas de seccionamento, contatoras e disjuntores motor (quando
            aplicável), com base nas cargas e no dimensionamento. Demais materiais cadastrados no
            catálogo podem ser acrescentados manualmente na secção de inclusões.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          {podeRetornarOrcamento ? (
            <button
              type="button"
              className="btn btn-success"
              disabled={sincronizandoOrcamento}
              onClick={() => void onRetornarOrcamento()}
            >
              {sincronizandoOrcamento ? 'Sincronizando…' : 'Retornar à proposta'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={!projetoId || exportando !== null}
            title="Composição aprovada, inclusões manuais e pendências de catálogo"
            onClick={() => onExportLista('xlsx')}
          >
            {exportando === 'xlsx' ? 'Excel…' : 'Excel'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!projetoId || exportando !== null}
            title="Composição aprovada, inclusões manuais e pendências de catálogo"
            onClick={() => onExportLista('pdf')}
          >
            {exportando === 'pdf' ? 'PDF…' : 'PDF'}
          </button>
          {canSepararMaterial ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!projetoId || !podeEditar || gerandoSugestoes}
              onClick={onGerar}
            >
              {gerandoSugestoes ? 'Gerando…' : 'Gerar sugestões'}
            </button>
          ) : null}
        </div>
      </div>

      {!projetoId ? (
        <div className="card mb-3">
          <div className="card-body">
            <label className="form-label fw-semibold" htmlFor="comp-projeto">
              Projeto
            </label>
            <select
              id="comp-projeto"
              className="form-select"
              style={{ maxWidth: '28rem' }}
              value={projetoId}
              onChange={onProjetoChange}
              disabled={loadingProjetos}
            >
              <option value="">Selecione um projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
            <p className="small text-muted mt-2 mb-0">
              Antes de gerar, confira as{' '}
              {canViewCargas ? <Link to={configuradorPaths.cargas()}>cargas</Link> : 'cargas'} e o{' '}
              {canViewDimensionamento ? (
                <Link to={configuradorPaths.dimensionamento()}>dimensionamento</Link>
              ) : (
                'dimensionamento'
              )}{' '}
              (corrente total de entrada).
            </p>
          </div>
        </div>
      ) : null}

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
          gruposPendencias={gruposPendencias}
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
