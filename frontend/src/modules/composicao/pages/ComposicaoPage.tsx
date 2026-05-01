import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { projetoPermiteEdicaoCargas } from '@/modules/cargas/utils/projetoEdicaoCargas'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { InclusaoManualCatalogoSection } from '../components/InclusaoManualCatalogoSection'
import { useAlternativasSugestaoQuery } from '../hooks/useAlternativasSugestaoQuery'
import { useAprovarSugestaoMutation } from '../hooks/useAprovarSugestaoMutation'
import { useComposicaoSnapshotQuery } from '../hooks/useComposicaoSnapshotQuery'
import { useGerarSugestoesMutation } from '../hooks/useGerarSugestoesMutation'
import { useReabrirComposicaoItemMutation } from '../hooks/useReabrirComposicaoItemMutation'
import { useReavaliarPendenciasMutation } from '../hooks/useReavaliarPendenciasMutation'
import {
  exportarComposicaoListaPdf,
  exportarComposicaoListaXlsx,
} from '../services/composicaoService'
import type {
  CargaDetalhe,
  ComposicaoItem,
  ProjetoAlimentacaoSnapshot,
  SugestaoItem,
} from '../types/composicao'

function em(v: string | null | undefined) {
  if (v == null || v === '') return '—'
  return v
}

function montarNomeArquivoProjeto(
  codigo: string | null | undefined,
  cliente: string | null | undefined,
  nome: string | null | undefined
) {
  return [codigo, cliente, nome]
    .map((valor) => (valor ?? '').trim())
    .filter((valor) => valor !== '')
    .join(' - ')
}

function formatPotenciaCarga(c: CargaDetalhe | null | undefined) {
  const raw = c?.potencia_corrente_valor
  if (raw != null && raw !== '') {
    const valor = String(raw)
    const u =
      c?.potencia_corrente_unidade_display ?? c?.potencia_corrente_unidade ?? ''
    return u ? `${valor} ${u}` : valor
  }
  return '—'
}

/** Descrição da carga (`cargas_carga.descricao`). */
function textoDescricaoCarga(c: CargaDetalhe | null | undefined) {
  if (!c) return '—'
  const d = c.descricao
  if (d == null) return '—'
  const s = typeof d === 'string' ? d : String(d)
  return s.trim() === '' ? '—' : s
}

function formatNumeroFasesProjeto(pa: ProjetoAlimentacaoSnapshot | undefined) {
  if (pa?.numero_fases != null) {
    return String(pa.numero_fases)
  }
  if (pa?.numero_fases_display && pa.numero_fases_display.trim() !== '') {
    return pa.numero_fases_display
  }
  return '—'
}

function formatCorrenteCarga(c: CargaDetalhe | null | undefined) {
  if (c?.corrente_a != null && c.corrente_a !== '') {
    return `${c.corrente_a} A`
  }
  return '—'
}

function CelulaTensaoProjeto({ pa }: { pa: ProjetoAlimentacaoSnapshot | undefined }) {
  if (!pa) return <td>—</td>
  return (
    <td className="small">
      <div>{em(pa.tensao_nominal_display)}</div>
      {pa.tipo_corrente_display ? (
        <div className="small text-muted">{pa.tipo_corrente_display}</div>
      ) : null}
    </td>
  )
}

export default function ComposicaoPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()

  const [alterarSugestao, setAlterarSugestao] = useState<SugestaoItem | null>(null)
  const [alternativaSelecionadaId, setAlternativaSelecionadaId] = useState<string | null>(
    null
  )
  const [exportando, setExportando] = useState<'pdf' | 'xlsx' | null>(null)
  const [confirmExportFmt, setConfirmExportFmt] = useState<'pdf' | 'xlsx' | null>(null)
  const [aprovandoTodas, setAprovandoTodas] = useState(false)
  const [itemReabrir, setItemReabrir] = useState<ComposicaoItem | null>(null)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const {
    data: snapshot,
    isPending: loadingSnap,
    isError,
    error: loadError,
  } = useComposicaoSnapshotQuery(projetoId || null)

  const projetoSelecionado = useMemo(
    () => (projetoId ? projetos.find((p) => p.id === projetoId) : undefined),
    [projetos, projetoId]
  )
  const canSepararMaterial = hasPermission(user, PERMISSION_KEYS.ALMOXARIFADO_SEPARAR_MATERIAL)
  const canEditarCatalogo = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const canViewCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA)
  const canViewDimensionamento = hasPermission(user, PERMISSION_KEYS.PROJETO_VISUALIZAR)
  const podeEditar = projetoPermiteEdicaoCargas(projetoSelecionado) && canSepararMaterial

  const gerarMutation = useGerarSugestoesMutation(projetoId || null)
  const reavaliarPendenciasMutation = useReavaliarPendenciasMutation(projetoId || null)
  const aprovarMutation = useAprovarSugestaoMutation(projetoId || null)
  const reabrirComposicaoItemMutation = useReabrirComposicaoItemMutation(projetoId || null)

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

  useEffect(() => {
    if (!alterarSugestao) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !aprovarMutation.isPending) {
        setAlterarSugestao(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [alterarSugestao, aprovarMutation.isPending])

  const projetoLabel = useMemo(() => {
    const p = projetoSelecionado
    return p ? `${p.codigo} — ${p.nome}` : ''
  }, [projetoSelecionado])

  const onProjetoChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value
      if (v) setSearchParams({ projeto: v })
      else setSearchParams({})
    },
    [setSearchParams]
  )

  const onGerar = useCallback(async () => {
    if (!projetoId || !podeEditar) return
    try {
      const data = await gerarMutation.mutateAsync(true)
      const erros = data.geracao?.erros_etapas ?? []
      const descartadas = data.geracao?.sugestoes_descartadas_aprovadas ?? 0
      if (erros.length > 0) {
        showToast({
          variant: 'warning',
          title: 'Sugestões geradas com avisos',
          message: erros.map((e) => `${e.etapa}: ${e.erro}`).join(' · '),
        })
      } else {
        showToast({
          variant: 'success',
          message:
            descartadas > 0
              ? `Sugestões atualizadas. ${descartadas} item(ns) já aprovado(s) não foram reabertos.`
              : 'Sugestões de composição atualizadas.',
        })
      }
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível gerar sugestões',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [projetoId, podeEditar, gerarMutation, showToast])

  const onReavaliarPendencias = useCallback(async () => {
    if (!projetoId || !podeEditar) return
    try {
      const data = await reavaliarPendenciasMutation.mutateAsync()
      const r = data.reavaliacao
      if (r) {
        const erros = r.erros ?? []
        const naoMap = r.categorias_nao_mapeadas ?? []
        const msgBase = `Pendências abertas: ${r.pendencias_abertas_antes} → ${r.pendencias_abertas_depois}. Categorias reavaliadas: ${r.categorias_reavaliadas.length}.`
        if (erros.length > 0 || naoMap.length > 0) {
          const extra = [
            ...naoMap.map((c) => `Sem regra automática: ${c}`),
            ...erros.map((e) => `${e.categoria_produto}: ${e.erro}`),
          ].join(' · ')
          showToast({
            variant: 'warning',
            title: 'Reavaliação concluída com avisos',
            message: `${msgBase} ${extra}`,
          })
        } else {
          showToast({ variant: 'success', message: msgBase })
        }
      } else {
        showToast({ variant: 'success', message: 'Pendências reavaliadas.' })
      }
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível reavaliar pendências',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [projetoId, podeEditar, reavaliarPendenciasMutation, showToast])

  const onAprovar = useCallback(
    async (sugestaoId: string, produtoId?: string | null) => {
      if (!podeEditar) return
      try {
        await aprovarMutation.mutateAsync({ sugestaoId, produtoId })
        showToast({ variant: 'success', message: 'Item aprovado na composição.' })
        setAlterarSugestao(null)
      } catch (err) {
        console.error(err)
        showToast({
          variant: 'danger',
          title: 'Não foi possível aprovar',
          message: extrairMensagemErroApi(err) || 'Tente novamente.',
        })
      }
    },
    [podeEditar, aprovarMutation, showToast]
  )

  const composicaoItens = snapshot?.composicao_itens ?? []

  const onReabrirItemAprovado = useCallback(async () => {
    if (!itemReabrir || !podeEditar) return
    try {
      await reabrirComposicaoItemMutation.mutateAsync({ composicaoItemId: itemReabrir.id })
      showToast({
        variant: 'success',
        message: 'Item reaberto e devolvido para sugestões de itens.',
      })
      setItemReabrir(null)
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível reabrir item aprovado',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [itemReabrir, podeEditar, reabrirComposicaoItemMutation, showToast])

  const onAprovarTodas = useCallback(async () => {
    if (!podeEditar || !snapshot || snapshot.sugestoes.length === 0) return
    try {
      setAprovandoTodas(true)
      for (const sugestao of snapshot.sugestoes) {
        await aprovarMutation.mutateAsync({ sugestaoId: sugestao.id, produtoId: null })
      }
      showToast({
        variant: 'success',
        message: 'Todas as sugestões foram aprovadas.',
      })
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível aprovar todas',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    } finally {
      setAprovandoTodas(false)
    }
  }, [aprovarMutation, podeEditar, showToast, snapshot])

  const executarExportacao = useCallback(
    async (fmt: 'pdf' | 'xlsx') => {
      if (!projetoId || !snapshot) return
      setExportando(fmt)
      try {
        const nomeProjeto = montarNomeArquivoProjeto(
          projetoSelecionado?.codigo ?? snapshot.projeto_codigo,
          projetoSelecionado?.cliente,
          projetoSelecionado?.nome ?? snapshot.projeto_nome
        )
        if (fmt === 'xlsx') await exportarComposicaoListaXlsx(projetoId, nomeProjeto)
        else await exportarComposicaoListaPdf(projetoId, nomeProjeto)
        showToast({ variant: 'success', message: 'Download iniciado.' })
      } catch (err) {
        console.error(err)
        showToast({
          variant: 'danger',
          title: 'Falha na exportação',
          message: extrairMensagemErroApi(err) || 'Tente novamente.',
        })
      } finally {
        setExportando(null)
      }
    },
    [
      projetoId,
      projetoSelecionado?.cliente,
      projetoSelecionado?.codigo,
      projetoSelecionado?.nome,
      showToast,
      snapshot,
    ]
  )

  const onExportLista = useCallback(
    (fmt: 'pdf' | 'xlsx') => {
      if (!snapshot || !projetoId) return
      if (snapshot.pendencias.length > 0) {
        setConfirmExportFmt(fmt)
        return
      }
      void executarExportacao(fmt)
    },
    [executarExportacao, projetoId, snapshot]
  )

  const modalComposicao = useMemo(() => {
    if (confirmExportFmt !== null) {
      return {
        title: 'Existem pendências na composição',
        message:
          'Há pendências em aberto. O ideal é resolver todas antes de exportar. Deseja exportar mesmo assim?',
        confirmLabel: 'Exportar mesmo assim',
        isConfirming: exportando !== null,
        tipo: 'export' as const,
      }
    }
    if (itemReabrir !== null) {
      return {
        title: 'Reabrir item aprovado?',
        message:
          'Este item sairá da composição aprovada e voltará para sugestões de itens, para você aprovar novamente ou alterar.',
        confirmLabel: 'Reabrir item',
        isConfirming: reabrirComposicaoItemMutation.isPending,
        tipo: 'reabrir' as const,
      }
    }
    return null
  }, [
    confirmExportFmt,
    exportando,
    itemReabrir,
    reabrirComposicaoItemMutation.isPending,
  ])

  return (
    <div className="container-fluid">
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
        onConfirm={() => {
          if (!modalComposicao) return
          if (modalComposicao.tipo === 'export') {
            if (!confirmExportFmt) return
            const fmt = confirmExportFmt
            setConfirmExportFmt(null)
            void executarExportacao(fmt)
            return
          }
          void onReabrirItemAprovado()
        }}
      />
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Composição do painel</h1>
          <p className="text-muted mb-0">
            Sugestões automáticas de seccionamento, contatoras e disjuntores motor (quando
            aplicável), com base nas cargas e no dimensionamento. Demais materiais cadastrados
            no catálogo podem ser acrescentados manualmente na secção de inclusões.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap align-items-center">
          {projetoId ? (
            <Link
              to={`/projetos/${projetoId}/fluxo/composicao`}
              className="btn btn-outline-info"
            >
              Voltar ao wizard
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={!projetoId || exportando !== null}
            title="Composição aprovada, inclusões manuais e pendências de catálogo"
            onClick={() => void onExportLista('xlsx')}
          >
            {exportando === 'xlsx' ? 'Excel…' : 'Excel'}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            disabled={!projetoId || exportando !== null}
            title="Composição aprovada, inclusões manuais e pendências de catálogo"
            onClick={() => void onExportLista('pdf')}
          >
            {exportando === 'pdf' ? 'PDF…' : 'PDF'}
          </button>
          {canSepararMaterial ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!projetoId || !podeEditar || gerarMutation.isPending}
              onClick={() => void onGerar()}
            >
              {gerarMutation.isPending ? 'Gerando…' : 'Gerar sugestões'}
            </button>
          ) : null}
        </div>
      </div>

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
            {canViewCargas ? (
              <Link to={projetoId ? `/cargas?projeto=${projetoId}` : '/cargas'}>cargas</Link>
            ) : (
              'cargas'
            )}{' '}
            e o{' '}
            {canViewDimensionamento ? (
              <Link
                to={
                  projetoId
                    ? `/cargas?projeto=${encodeURIComponent(projetoId)}#dimensionamento-resumo`
                    : '/cargas'
                }
              >
                dimensionamento
              </Link>
            ) : (
              'dimensionamento'
            )}{' '}
            (corrente total de entrada).
          </p>
        </div>
      </div>

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

      {projetoId && loadingSnap && (
        <p className="text-muted mb-0">Carregando composição…</p>
      )}

      {projetoId && !loadingSnap && isError && (
        <div className="alert alert-danger" role="alert">
          {loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar os dados.'}
        </div>
      )}

      {projetoId && !loadingSnap && !isError && snapshot && (
        <div className="row g-4">
          <div className="col-12">
            <p className="small text-muted mb-0">
              <strong>{projetoLabel || snapshot.projeto}</strong>
              {snapshot.totais ? (
                <>
                  {' '}
                  · {snapshot.totais.sugestoes} sugestão(ões) ·{' '}
                  {snapshot.totais.pendencias} pendência(s)
                  {snapshot.totais.composicao_itens != null ? (
                    <> · {snapshot.totais.composicao_itens} item(ns) na composição</>
                  ) : null}
                  {snapshot.totais.inclusoes_manuais != null ? (
                    <> · {snapshot.totais.inclusoes_manuais} inclusão(ões) manual(is)</>
                  ) : null}
                </>
              ) : null}
            </p>
            {snapshot.geracao?.erros_etapas &&
              snapshot.geracao.erros_etapas.length > 0 && (
                <div className="alert alert-warning mt-2 mb-0" role="status">
                  <strong>Avisos na última geração:</strong>
                  <ul className="mb-0 mt-1 small">
                    {snapshot.geracao.erros_etapas.map((e, i) => (
                      <li key={i}>
                        {e.etapa}: {e.erro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <div className="col-12">
            <h2 className="h5 mb-3">Composição aprovada</h2>
            {composicaoItens.length === 0 ? (
              <p className="text-muted small mb-0">
                Nenhum item aprovado ainda. Use &quot;Aprovar&quot; nas sugestões.
              </p>
            ) : (
              <div className="table-responsive app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Potência</th>
                      <th>Corrente</th>
                      <th>Tensão</th>
                      <th>Fases</th>
                      <th>Qtd.</th>
                      <th>Categoria</th>
                      <th>Produto</th>
                      <th>Código</th>
                      <th>Status</th>
                      {podeEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {composicaoItens.map((c) => (
                      <tr key={c.id}>
                        <td>{c.carga ? c.carga.tag : '—'}</td>
                        <td>{textoDescricaoCarga(c.carga)}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {em(c.carga?.tipo_display)}
                          </span>
                        </td>
                        <td>{formatPotenciaCarga(c.carga)}</td>
                        <td>{formatCorrenteCarga(c.carga)}</td>
                        <CelulaTensaoProjeto pa={c.projeto_alimentacao} />
                        <td>{formatNumeroFasesProjeto(c.projeto_alimentacao)}</td>
                        <td>{c.quantidade}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {c.categoria_produto_display ?? c.categoria_produto}
                          </span>
                        </td>
                        <td className="small">{c.produto?.descricao ?? '—'}</td>
                        <td>
                          <span className="fw-semibold font-monospace">
                            {c.produto_codigo ?? c.produto?.codigo ?? '—'}
                          </span>
                        </td>
                        <td>{c.status_display ?? 'Aprovado'}</td>
                        {podeEditar ? (
                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              disabled={reabrirComposicaoItemMutation.isPending}
                              onClick={() => setItemReabrir(c)}
                            >
                              Reabrir
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="col-12">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 className="h5 mb-0">Sugestões de itens</h2>
              {podeEditar && snapshot.sugestoes.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  disabled={aprovarMutation.isPending || aprovandoTodas}
                  onClick={() => void onAprovarTodas()}
                >
                  {aprovandoTodas ? 'Aprovando todas...' : 'Aprovar todas'}
                </button>
              ) : null}
            </div>
            {snapshot.sugestoes.length === 0 ? (
              <p className="text-muted small mb-0">
                Nenhuma sugestão ainda. Use &quot;Gerar sugestões&quot; após cadastrar cargas
                e dimensionar o projeto.
              </p>
            ) : (
              <div className="table-responsive app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Potência</th>
                      <th>Corrente</th>
                      <th>Tensão</th>
                      <th>Fases</th>
                      <th>Qtd.</th>
                      <th>Categoria</th>
                      <th>Produto</th>
                      <th>Código</th>
                      <th>Status</th>
                      {podeEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sugestoes.map((s) => (
                      <tr key={s.id}>
                        <td>{s.carga ? s.carga.tag : '—'}</td>
                        <td>{textoDescricaoCarga(s.carga)}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {em(s.carga?.tipo_display)}
                          </span>
                        </td>
                        <td>{formatPotenciaCarga(s.carga)}</td>
                        <td>{formatCorrenteCarga(s.carga)}</td>
                        <CelulaTensaoProjeto pa={s.projeto_alimentacao} />
                        <td>{formatNumeroFasesProjeto(s.projeto_alimentacao)}</td>
                        <td>{s.quantidade}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {s.categoria_produto_display ?? s.categoria_produto}
                          </span>
                        </td>
                        <td className="small">{s.produto?.descricao ?? '—'}</td>
                        <td>
                          <span className="fw-semibold font-monospace">
                            {s.produto_codigo ?? s.produto?.codigo ?? '—'}
                          </span>
                        </td>
                        <td>{s.status_display ?? s.status}</td>
                        {podeEditar ? (
                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-success me-1"
                              disabled={aprovarMutation.isPending || aprovandoTodas}
                              onClick={() => void onAprovar(s.id, null)}
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={aprovarMutation.isPending || aprovandoTodas}
                              onClick={() => abrirAlterarSugestao(s)}
                            >
                              Alterar
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="col-12">
            <h2 className="h5 mb-3">Pendências (catálogo)</h2>
            <p className="small text-muted">
              Quando não há produto compatível no catálogo, uma pendência é registrada. Use
              as ações abaixo para cadastrar produtos e reexecutar as regras deste projeto.
            </p>
            {snapshot.pendencias.length === 0 ? (
              <p className="text-muted small mb-0">Nenhuma pendência aberta.</p>
            ) : (
              <div className="table-responsive app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Potência</th>
                      <th>Corrente</th>
                      <th>Tensão</th>
                      <th>Fases</th>
                      <th>Qtd.</th>
                      <th>Categoria</th>
                      <th>Produto</th>
                      <th>Código</th>
                      <th>Detalhe</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.pendencias.map((p) => (
                      <tr key={p.id}>
                        <td>{p.carga ? p.carga.tag : '—'}</td>
                        <td>{textoDescricaoCarga(p.carga)}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {em(p.carga?.tipo_display)}
                          </span>
                        </td>
                        <td>{formatPotenciaCarga(p.carga)}</td>
                        <td>{formatCorrenteCarga(p.carga)}</td>
                        <CelulaTensaoProjeto pa={p.projeto_alimentacao} />
                        <td>{formatNumeroFasesProjeto(p.projeto_alimentacao)}</td>
                        <td>—</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {p.categoria_produto_display ?? p.categoria_produto}
                          </span>
                        </td>
                        <td>—</td>
                        <td>—</td>
                        <td className="small">{p.descricao}</td>
                        <td>{p.status_display ?? p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="col-12">
            <div className="card border">
              <div className="card-body">
                <h3 className="h6 mb-2">Resolver pendências</h3>
                <p className="small text-muted mb-3">
                  Cadastre no catálogo produtos compatíveis com a categoria e os parâmetros
                  elétricos das pendências. Depois, reavalie para aplicar de novo as regras
                  de composição; em seguida use &quot;Gerar sugestões&quot; no topo para
                  atualizar as sugestões de itens do painel.
                </p>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  {canEditarCatalogo ? (
                    <Link
                      to={
                        projetoId
                          ? `/catalogo/novo?retorno=${encodeURIComponent(`/composicao?projeto=${projetoId}`)}`
                          : '/catalogo/novo'
                      }
                      className="btn btn-outline-primary"
                    >
                      Cadastrar produto no catálogo
                    </Link>
                  ) : null}
                  {canSepararMaterial ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        !projetoId || !podeEditar || reavaliarPendenciasMutation.isPending
                      }
                      onClick={() => void onReavaliarPendencias()}
                    >
                      {reavaliarPendenciasMutation.isPending
                        ? 'Reavaliando…'
                        : 'Reavaliar pendências'}
                    </button>
                  ) : null}
                </div>
                {!podeEditar && projetoId ? (
                  <p className="small text-muted mb-0 mt-2">
                    Projeto finalizado: reavaliação de pendências não está disponível.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <InclusaoManualCatalogoSection
            projetoId={projetoId}
            podeEditar={podeEditar}
            inclusoes={snapshot.inclusoes_manuais ?? []}
          />

          <div className="col-12">
            <details className="card bg-light border-0">
              <summary className="card-body py-3" style={{ cursor: 'pointer' }}>
                <strong>Memorial de cálculos (sugestões)</strong>
              </summary>
              <div className="card-body pt-0">
                <p className="small text-muted mb-2">
                  Detalhes técnicos registrados pelo motor de sugestões (backend).
                </p>
                {snapshot.sugestoes.filter((s) => s.memoria_calculo).length === 0 ? (
                  <p className="small mb-0 text-muted">Sem memorial de cálculo preenchido.</p>
                ) : (
                  <ul className="list-unstyled small mb-0">
                    {snapshot.sugestoes
                      .filter((s) => s.memoria_calculo)
                      .map((s) => (
                        <li key={s.id} className="mb-2">
                          <strong>{s.produto_codigo ?? s.produto?.codigo}</strong>
                          <pre className="mt-1 mb-0 p-2 bg-white border rounded small overflow-auto">
                            {s.memoria_calculo}
                          </pre>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {alterarSugestao ? (
        <>
          <div
            className="modal fade show d-block"
            style={{ zIndex: 1060 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comp-alterar-title"
          >
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable px-2">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 id="comp-alterar-title" className="modal-title h5 mb-0">
                    Alternativas de catálogo
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAlterarSugestao(null)}
                    disabled={aprovarMutation.isPending}
                    aria-label="Fechar"
                  />
                </div>
                <div className="modal-body">
                  <p className="small text-muted">
                    Mesmas regras da sugestão automática para a categoria deste item (ex.:
                    corrente compatível; contatora com mesma bobina; montagem alinhada quando
                    aplicável). Selecione um produto e confirme para aprovar com substituição.
                  </p>
                  {loadingAlternativas ? (
                    <p className="small text-muted mb-0">Carregando alternativas…</p>
                  ) : erroAlternativas ? (
                    <p className="text-danger small mb-0">
                      {loadErroAlternativas instanceof Error
                        ? loadErroAlternativas.message
                        : 'Não foi possível carregar as alternativas.'}
                    </p>
                  ) : alternativas.length === 0 ? (
                    <p className="small text-muted mb-0">
                      Nenhuma alternativa listada. Você pode fechar e usar &quot;Aprovar&quot;
                      na linha para manter o produto sugerido.
                    </p>
                  ) : (
                    <div className="table-responsive app-data-table">
                      <table className="table table-sm table-hover align-middle">
                        <thead>
                          <tr>
                            <th aria-hidden />
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>Fabricante</th>
                            <th className="text-end">Valor unit.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alternativas.map((a) => (
                            <tr
                              key={a.id}
                              role="button"
                              tabIndex={0}
                              className={
                                alternativaSelecionadaId === a.id ? 'table-active' : undefined
                              }
                              onClick={() => setAlternativaSelecionadaId(a.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setAlternativaSelecionadaId(a.id)
                                }
                              }}
                            >
                              <td>
                                <input
                                  type="radio"
                                  className="form-check-input"
                                  name="alt-prod"
                                  checked={alternativaSelecionadaId === a.id}
                                  onChange={() => setAlternativaSelecionadaId(a.id)}
                                  aria-label={`Selecionar ${a.codigo}`}
                                />
                              </td>
                              <td className="font-monospace fw-semibold">{a.codigo}</td>
                              <td className="small">{a.descricao}</td>
                              <td className="small">{em(a.fabricante)}</td>
                              <td className="text-end small">{em(a.valor_unitario)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setAlterarSugestao(null)}
                    disabled={aprovarMutation.isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      aprovarMutation.isPending ||
                      !alterarSugestao ||
                      !alternativaSelecionadaId
                    }
                    onClick={() =>
                      void onAprovar(alterarSugestao.id, alternativaSelecionadaId)
                    }
                  >
                    {aprovarMutation.isPending ? 'Aprovando…' : 'Aprovar produto selecionado'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1055 }}
            aria-hidden="true"
            onClick={() => {
              if (!aprovarMutation.isPending) setAlterarSugestao(null)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
