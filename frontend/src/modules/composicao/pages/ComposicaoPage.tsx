import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { projetoPermiteEdicaoCargas } from '@/modules/cargas/utils/projetoEdicaoCargas'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useAlternativasSugestaoQuery } from '../hooks/useAlternativasSugestaoQuery'
import { useAprovarSugestaoMutation } from '../hooks/useAprovarSugestaoMutation'
import { useComposicaoSnapshotQuery } from '../hooks/useComposicaoSnapshotQuery'
import { useGerarSugestoesMutation } from '../hooks/useGerarSugestoesMutation'
import type { SugestaoItem } from '../types/composicao'

function em(v: string | null | undefined) {
  if (v == null || v === '') return '—'
  return v
}

export default function ComposicaoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()

  const [alterarSugestao, setAlterarSugestao] = useState<SugestaoItem | null>(null)
  const [alternativaSelecionadaId, setAlternativaSelecionadaId] = useState<string | null>(
    null
  )

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const {
    data: snapshot,
    isPending: loadingSnap,
    isError,
    error: loadError,
    refetch,
  } = useComposicaoSnapshotQuery(projetoId || null)

  const projetoSelecionado = useMemo(
    () => (projetoId ? projetos.find((p) => p.id === projetoId) : undefined),
    [projetos, projetoId]
  )
  const podeEditar = projetoPermiteEdicaoCargas(projetoSelecionado)

  const gerarMutation = useGerarSugestoesMutation(projetoId || null)
  const aprovarMutation = useAprovarSugestaoMutation(projetoId || null)

  const {
    data: alternativas = [],
    isPending: loadingAlternativas,
    isError: erroAlternativas,
    error: loadErroAlternativas,
  } = useAlternativasSugestaoQuery(alterarSugestao?.id ?? null, alterarSugestao != null)

  useEffect(() => {
    if (!alterarSugestao) return
    setAlternativaSelecionadaId(alterarSugestao.produto?.id ?? null)
  }, [alterarSugestao])

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
      if (erros.length > 0) {
        showToast({
          variant: 'warning',
          title: 'Sugestões geradas com avisos',
          message: erros.map((e) => `${e.etapa}: ${e.erro}`).join(' · '),
        })
      } else {
        showToast({
          variant: 'success',
          message: 'Sugestões de composição atualizadas.',
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

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Composição do painel</h1>
          <p className="text-muted mb-0">
            Sugestões automáticas de seccionamento, contatoras e disjuntores motor (quando
            aplicável), com base nas cargas e no dimensionamento de corrente do projeto.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void refetch()}
            disabled={!projetoId}
          >
            Atualizar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!projetoId || !podeEditar || gerarMutation.isPending}
            onClick={() => void onGerar()}
          >
            {gerarMutation.isPending ? 'Gerando…' : 'Gerar sugestões'}
          </button>
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
            <Link to={projetoId ? `/cargas?projeto=${projetoId}` : '/cargas'}>cargas</Link>
            {' '}e o{' '}
            <Link
              to={projetoId ? `/dimensionamento?projeto=${projetoId}` : '/dimensionamento'}
            >
              dimensionamento
            </Link>{' '}
            (corrente total de entrada).
          </p>
        </div>
      </div>

      {!projetoId && (
        <p className="text-muted">Selecione um projeto para ver a composição sugerida.</p>
      )}

      {projetoId && !podeEditar && (
        <div className="alert alert-secondary" role="status">
          Projeto finalizado: apenas visualização. A geração de sugestões e aprovações não
          estão disponíveis.
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
            <h2 className="h5 mb-3">Sugestões de itens</h2>
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
                      <th>Parte do painel</th>
                      <th>Categoria</th>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Tensão (projeto)</th>
                      <th>Carga</th>
                      <th>Tipo carga</th>
                      <th>Corrente (A)</th>
                      <th>Corrente ref. (A)</th>
                      <th>Qtd.</th>
                      <th>Status</th>
                      {podeEditar ? <th className="text-end">Ações</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sugestoes.map((s) => (
                      <tr key={s.id}>
                        <td>{s.parte_painel_display ?? s.parte_painel}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {s.categoria_produto_display ?? s.categoria_produto}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold font-monospace">
                            {s.produto_codigo ?? s.produto?.codigo ?? '—'}
                          </span>
                        </td>
                        <td className="small">{s.produto?.descricao ?? '—'}</td>
                        <td className="small">
                          {s.projeto_alimentacao?.tensao_nominal_display ?? '—'}
                        </td>
                        <td>{s.carga ? s.carga.tag : '—'}</td>
                        <td className="small">{em(s.carga?.tipo_display)}</td>
                        <td>{em(s.carga?.corrente_a)}</td>
                        <td>{em(s.corrente_referencia_a)}</td>
                        <td>{s.quantidade}</td>
                        <td>{s.status_display ?? s.status}</td>
                        {podeEditar ? (
                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-success me-1"
                              disabled={aprovarMutation.isPending}
                              onClick={() => void onAprovar(s.id, null)}
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={aprovarMutation.isPending}
                              onClick={() => setAlterarSugestao(s)}
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
                      <th>Parte do painel</th>
                      <th>Categoria</th>
                      <th>Código</th>
                      <th>Produto</th>
                      <th>Tensão (projeto)</th>
                      <th>Carga</th>
                      <th>Tipo carga</th>
                      <th>Corrente (A)</th>
                      <th>Corrente ref. (A)</th>
                      <th>Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {composicaoItens.map((c) => (
                      <tr key={c.id}>
                        <td>{c.parte_painel_display ?? c.parte_painel}</td>
                        <td>
                          <span className="badge text-bg-secondary">
                            {c.categoria_produto_display ?? c.categoria_produto}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold font-monospace">
                            {c.produto_codigo ?? c.produto?.codigo ?? '—'}
                          </span>
                        </td>
                        <td className="small">{c.produto?.descricao ?? '—'}</td>
                        <td className="small">
                          {c.projeto_alimentacao?.tensao_nominal_display ?? '—'}
                        </td>
                        <td>{c.carga ? c.carga.tag : '—'}</td>
                        <td className="small">{em(c.carga?.tipo_display)}</td>
                        <td>{em(c.carga?.corrente_a)}</td>
                        <td>{em(c.corrente_referencia_a)}</td>
                        <td>{c.quantidade}</td>
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
              Quando não há produto compatível no catálogo, uma pendência é registrada. Em
              uma etapa futura será possível cadastrar um produto adequado e reavaliar.
            </p>
            {snapshot.pendencias.length === 0 ? (
              <p className="text-muted small mb-0">Nenhuma pendência aberta.</p>
            ) : (
              <div className="table-responsive app-data-table">
                <table className="table table-sm table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Parte</th>
                      <th>Categoria</th>
                      <th>Carga</th>
                      <th>Corrente ref. (A)</th>
                      <th>Descrição</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.pendencias.map((p) => (
                      <tr key={p.id}>
                        <td>{p.parte_painel_display ?? p.parte_painel}</td>
                        <td>{p.categoria_produto_display ?? p.categoria_produto}</td>
                        <td>{p.carga ? p.carga.tag : '—'}</td>
                        <td>{em(p.corrente_referencia_a)}</td>
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
            <div className="card bg-light border-0">
              <div className="card-body">
                <h3 className="h6">Memória de cálculo (sugestões)</h3>
                <p className="small text-muted mb-2">
                  Detalhes técnicos registrados pelo motor de sugestões (backend).
                </p>
                {snapshot.sugestoes.filter((s) => s.memoria_calculo).length === 0 ? (
                  <p className="small mb-0 text-muted">Sem memória de cálculo preenchida.</p>
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
            </div>
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
                    Mesmas regras da sugestão automática (corrente compatível; contatora com
                    mesma bobina; montagem alinhada ao produto sugerido, quando aplicável).
                    Selecione um produto e confirme para aprovar com substituição.
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
