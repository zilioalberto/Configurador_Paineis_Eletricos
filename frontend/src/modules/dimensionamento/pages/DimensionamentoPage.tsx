import { type ChangeEvent, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { projetoPermiteEdicaoCargas } from '@/modules/cargas/utils/projetoEdicaoCargas'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { useDimensionamentoQuery } from '../hooks/useDimensionamentoQuery'
import { useRecalcularDimensionamentoMutation } from '../hooks/useRecalcularDimensionamentoMutation'

export default function DimensionamentoPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const {
    data: resumo,
    isPending: loadingResumo,
    isError,
    error: loadError,
    refetch,
  } = useDimensionamentoQuery(projetoId || null)

  const projetoSelecionado = useMemo(
    () => (projetoId ? projetos.find((p) => p.id === projetoId) : undefined),
    [projetos, projetoId]
  )
  const canEditarProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const podeEditarProjeto = projetoPermiteEdicaoCargas(projetoSelecionado) && canEditarProjeto

  const recalcMutation = useRecalcularDimensionamentoMutation(projetoId || null)

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

  const onRecalcular = useCallback(async () => {
    if (!projetoId || !podeEditarProjeto) return
    try {
      await recalcMutation.mutateAsync()
      showToast({
        variant: 'success',
        message: 'Dimensionamento recalculado com base nas cargas atuais.',
      })
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível recalcular',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [projetoId, podeEditarProjeto, recalcMutation, showToast])

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Dimensionamento</h1>
          <p className="text-muted mb-0">
            Corrente total do painel para o projeto selecionado e definição de seccionamento
            geral — base para a composição do painel.
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
          {canEditarProjeto ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!projetoId || !podeEditarProjeto || recalcMutation.isPending}
              onClick={() => void onRecalcular()}
            >
              {recalcMutation.isPending ? 'Recalculando…' : 'Recalcular'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <label className="form-label fw-semibold" htmlFor="dim-projeto">
            Projeto
          </label>
          <select
            id="dim-projeto"
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
        </div>
      </div>

      {!projetoId && (
        <p className="text-muted">Escolha um projeto para ver o dimensionamento.</p>
      )}

      {projetoId && !podeEditarProjeto && (
        <div className="alert alert-secondary" role="status">
          Projeto finalizado: visualização somente leitura. O recálculo não está disponível.
        </div>
      )}

      {projetoId && loadingResumo && (
        <p className="text-muted mb-0">Carregando resumo…</p>
      )}

      {projetoId && !loadingResumo && isError && (
        <div className="alert alert-danger" role="alert">
          {loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar o dimensionamento.'}
        </div>
      )}

      {projetoId && !loadingResumo && !isError && resumo && (
        <div className="row g-3">
          <div className="col-12">
            <p className="small text-muted mb-2">
              <strong>{projetoLabel || projetoId}</strong>
              {resumo.atualizado_em ? (
                <>
                  {' '}
                  · Atualizado em{' '}
                  {new Date(resumo.atualizado_em).toLocaleString()}
                </>
              ) : null}
            </p>
          </div>

          <div className="col-md-6">
            <div className="card border-primary h-100">
              <div className="card-body">
                <h2 className="h6 text-primary mb-3">Corrente total de entrada</h2>
                <p className="display-6 mb-1">{resumo.corrente_total_painel_a}</p>
                <p className="text-muted small mb-0">Ampères (A) — soma das cargas motor ativas</p>
                <p className="small text-muted mt-3 mb-0">
                  Este valor alimenta o fluxo de{' '}
                  <strong>composição</strong> (ex.: dimensionamento de seccionadora / proteção
                  geral conforme a corrente do projeto).
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">Seccionamento geral</h2>
                <dl className="row small mb-0">
                  <dt className="col-sm-5">Previsto no projeto</dt>
                  <dd className="col-sm-7">
                    {resumo.possui_seccionamento ? 'Sim' : 'Não'}
                  </dd>
                  <dt className="col-sm-5">Tipo</dt>
                  <dd className="col-sm-7">
                    {resumo.possui_seccionamento
                      ? resumo.tipo_seccionamento_display ??
                        resumo.tipo_seccionamento ??
                        '—'
                      : '—'}
                  </dd>
                </dl>
                <p className="small text-muted mt-3 mb-0">
                  Os dados de seccionamento vêm do cadastro do projeto.
                  {canEditarProjeto ? (
                    <>
                      {' '}
                      Para alterar, use{' '}
                      <Link to={projetoId ? `/projetos/${projetoId}/editar` : '/projetos'}>
                        editar projeto
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card bg-light border-0">
              <div className="card-body py-2">
                <p className="small text-muted mb-0">
                  Detalhes de PLC, fonte 24 Vcc e contagem de I/O poderão ser destacados aqui em
                  versões futuras; o foco atual é a corrente total e o vínculo com seccionamento /
                  composição.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
