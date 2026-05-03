import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useDimensionamentoQuery } from '@/modules/dimensionamento/hooks/useDimensionamentoQuery'
import { useRecalcularDimensionamentoMutation } from '@/modules/dimensionamento/hooks/useRecalcularDimensionamentoMutation'
import { ProjetoIdentificacaoFluxo } from '@/modules/projetos/components/ProjetoIdentificacaoFluxo'
import { ProjetoFluxoStepper } from '@/modules/projetos/components/ProjetoFluxoStepper'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaTable from '../components/CargaTable'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useDeleteCargaMutation } from '../hooks/useCargaMutations'
import {
  filtrarProjetosComEdicaoCargas,
  projetoPermiteEdicaoCargas,
} from '../utils/projetoEdicaoCargas'

type DeleteTarget = { id: string; label: string }

export default function CargaListPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [autoRecalcFeedback, setAutoRecalcFeedback] = useState('')
  const autoRecalcKeyRef = useRef<string>('')
  const autoRecalcPendingRef = useRef(false)
  const autoRecalcFeedbackTimerRef = useRef<number | null>(null)
  const canManageCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)
  const canEditarProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()

  const projetoSelecionado = useMemo(
    () => (projetoId ? projetos.find((p) => p.id === projetoId) : undefined),
    [projetos, projetoId]
  )
  const projetoFinalizado =
    projetoSelecionado != null && !projetoPermiteEdicaoCargas(projetoSelecionado)
  const projetosNoFiltro = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )
  const projetoIdListagem = projetoId && !projetoFinalizado ? projetoId : null

  const {
    data: cargas = [],
    isPending: loadingCargas,
    isError,
    error: loadError,
  } = useCargaListQuery(projetoIdListagem)
  const {
    data: resumoDimensionamento,
    isPending: loadingResumoDimensionamento,
    isError: isResumoError,
    error: resumoError,
  } = useDimensionamentoQuery(projetoIdListagem)
  const recalcMutation = useRecalcularDimensionamentoMutation(projetoIdListagem)

  const deleteMutation = useDeleteCargaMutation(projetoIdListagem)

  const podeRecalcularDimensionamento = canEditarProjeto && !projetoFinalizado
  const cargasSignature = useMemo(
    () => cargas.map((c) => `${c.id}:${c.atualizado_em ?? ''}`).join('|'),
    [cargas]
  )

  useEffect(() => {
    if (!projetoId || loadingProjetos || projetos.length === 0) return
    const sel = projetos.find((p) => p.id === projetoId)
    if (sel?.status === 'FINALIZADO') {
      setSearchParams({}, { replace: true })
      showToast({
        variant: 'warning',
        message:
          'Projetos com status Finalizado não podem ser usados para gerenciar cargas.',
      })
    }
  }, [projetoId, loadingProjetos, projetos, setSearchParams, showToast])

  const onProjetoFilterChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value
      if (v) {
        setSearchParams({ projeto: v })
      } else {
        setSearchParams({})
      }
    },
    [setSearchParams]
  )

  const onDeleteRequest = useCallback((id: string) => {
    const c = cargas.find((x) => x.id === id)
    setDeleteTarget({
      id,
      label: c?.tag?.trim() || c?.descricao?.trim() || 'esta carga',
    })
  }, [cargas])

  const closeModal = useCallback(() => {
    if (!deleteMutation.isPending) setDeleteTarget(null)
  }, [deleteMutation.isPending])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast({ variant: 'success', message: 'Carga excluída com sucesso.' })
    } catch (err) {
      console.error(err)
      setDeleteTarget(null)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Tente novamente.',
      })
    }
  }, [deleteTarget, deleteMutation, showToast])

  const onRecalcularDimensionamento = useCallback(async () => {
    if (!projetoIdListagem || !podeRecalcularDimensionamento) return
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
  }, [projetoIdListagem, podeRecalcularDimensionamento, recalcMutation, showToast])

  useEffect(() => {
    if (!projetoIdListagem || !podeRecalcularDimensionamento) return
    if (loadingCargas || isError) return

    const key = `${projetoIdListagem}|${cargasSignature}`
    if (!cargasSignature || autoRecalcKeyRef.current === key || autoRecalcPendingRef.current) {
      return
    }

    autoRecalcPendingRef.current = true
    setAutoRecalcFeedback('Atualizando resumo automaticamente...')
    void (async () => {
      try {
        await recalcMutation.mutateAsync()
        autoRecalcKeyRef.current = key
        setAutoRecalcFeedback('Resumo atualizado automaticamente.')
        if (autoRecalcFeedbackTimerRef.current) {
          window.clearTimeout(autoRecalcFeedbackTimerRef.current)
        }
        autoRecalcFeedbackTimerRef.current = window.setTimeout(() => {
          setAutoRecalcFeedback('')
          autoRecalcFeedbackTimerRef.current = null
        }, 2200)
      } catch (err) {
        console.error(err)
        setAutoRecalcFeedback('')
      } finally {
        autoRecalcPendingRef.current = false
      }
    })()
  }, [
    projetoIdListagem,
    podeRecalcularDimensionamento,
    loadingCargas,
    isError,
    cargasSignature,
    recalcMutation,
  ])

  useEffect(() => {
    return () => {
      if (autoRecalcFeedbackTimerRef.current) {
        window.clearTimeout(autoRecalcFeedbackTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir carga"
        message={
          deleteTarget
            ? `Deseja realmente excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void confirmDelete()}
      />

      {projetoIdListagem ? (
        <ProjetoFluxoStepper projetoId={projetoIdListagem} etapaAtual="cargas" />
      ) : null}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Cargas do projeto</h1>
          <p className="text-muted mb-0">
            Cadastre cargas vinculadas ao projeto (motores, válvulas, sensores,
            etc.).
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {canManageCargas ? (
            <Link
              to={
                projetoIdListagem
                  ? `/cargas/novo?projeto=${encodeURIComponent(projetoIdListagem)}`
                  : '/cargas/novo'
              }
              className={`btn btn-primary${!projetoIdListagem ? ' disabled' : ''}`}
              aria-disabled={!projetoIdListagem}
              onClick={(e) => {
                if (!projetoIdListagem) e.preventDefault()
              }}
            >
              Nova carga
            </Link>
          ) : null}
        </div>
      </div>

      {!projetoId ? (
        <div className="card mb-3">
          <div className="card-body">
            <label className="form-label fw-semibold" htmlFor="filtro-projeto-cargas">
              Projeto
            </label>
            <select
              id="filtro-projeto-cargas"
              className="form-select"
              style={{ maxWidth: '28rem' }}
              value={projetoFinalizado ? '' : projetoId}
              onChange={onProjetoFilterChange}
              disabled={loadingProjetos}
            >
              <option value="">Selecione um projeto para listar as cargas</option>
              {projetosNoFiltro.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </option>
              ))}
            </select>
            {!loadingProjetos && projetos.length === 0 && (
              <p className="text-muted small mt-2 mb-0">
                Não há projetos cadastrados.{' '}
                {canCreateProjeto ? <Link to="/projetos/novo">Criar projeto</Link> : null}
              </p>
            )}
            {!loadingProjetos &&
              projetos.length > 0 &&
              projetosNoFiltro.length === 0 && (
                <p className="text-muted small mt-2 mb-0">
                  Não há projetos em andamento. Projetos finalizados não aparecem
                  aqui para edição de cargas.
                </p>
              )}
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          {!projetoIdListagem && !projetoFinalizado && (
            <p className="text-muted mb-0">
              Escolha um projeto na lista acima para visualizar e gerenciar as cargas.
            </p>
          )}

          {projetoFinalizado && (
            <div className="alert alert-secondary mb-0" role="status">
              Este projeto está finalizado. A lista de cargas deste projeto não
              está disponível para gestão nesta tela.
            </div>
          )}

          {projetoIdListagem && projetoSelecionado ? (
            <ProjetoIdentificacaoFluxo
              embedded
              projetoCodigo={projetoSelecionado.codigo}
              projetoNome={projetoSelecionado.nome}
              fallbackId={projetoIdListagem}
              htmlId="carga-lista-projeto"
            />
          ) : projetoIdListagem ? (
            <ProjetoIdentificacaoFluxo
              embedded
              fallbackId={projetoIdListagem}
              htmlId="carga-lista-projeto"
            />
          ) : null}

          {projetoIdListagem && loadingCargas && (
            <p className="mb-0 text-muted">Carregando cargas...</p>
          )}

          {projetoIdListagem && !loadingCargas && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar as cargas.'}
            </div>
          )}

          {projetoIdListagem && !loadingCargas && !isError && (
            <CargaTable
              cargas={cargas}
              projetoId={projetoIdListagem}
              onDeleteRequest={onDeleteRequest}
              canManage={canManageCargas}
            />
          )}
        </div>
      </div>

      {projetoIdListagem ? (
        <div className="card mt-3" id="dimensionamento-resumo">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h2 className="h5 mb-0">Resumo de dimensionamento</h2>
              <div className="d-flex gap-2">
                {canEditarProjeto ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!podeRecalcularDimensionamento || recalcMutation.isPending}
                    onClick={() => void onRecalcularDimensionamento()}
                  >
                    {recalcMutation.isPending ? 'Recalculando...' : 'Recalcular'}
                  </button>
                ) : null}
              </div>
            </div>
            {autoRecalcFeedback ? (
              <p className="small text-muted mb-3">{autoRecalcFeedback}</p>
            ) : null}

            {projetoFinalizado ? (
              <div className="alert alert-secondary" role="status">
                Projeto finalizado: visualização somente leitura. O recálculo não está
                disponível.
              </div>
            ) : null}

            {loadingResumoDimensionamento ? (
              <p className="text-muted mb-0">Carregando resumo...</p>
            ) : null}

            {!loadingResumoDimensionamento && isResumoError ? (
              <div className="alert alert-danger mb-0" role="alert">
                {resumoError instanceof Error
                  ? resumoError.message
                  : 'Não foi possível carregar o dimensionamento.'}
              </div>
            ) : null}

            {!loadingResumoDimensionamento && !isResumoError && resumoDimensionamento ? (
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card border-primary h-100">
                    <div className="card-body">
                      <h3 className="h6 text-primary mb-3">Corrente total de entrada</h3>
                      <p className="display-6 mb-1">
                        {resumoDimensionamento.corrente_total_painel_a}
                      </p>
                      <p className="text-muted small mb-0">
                        Ampères (A) - soma das cargas ativas consideradas no dimensionamento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100">
                    <div className="card-body">
                      <h3 className="h6 mb-3">Seccionamento geral</h3>
                      <dl className="row small mb-0">
                        <dt className="col-sm-5">Previsto no projeto</dt>
                        <dd className="col-sm-7">
                          {resumoDimensionamento.possui_seccionamento ? 'Sim' : 'Não'}
                        </dd>
                        <dt className="col-sm-5">Tipo</dt>
                        <dd className="col-sm-7">
                          {resumoDimensionamento.possui_seccionamento
                            ? resumoDimensionamento.tipo_seccionamento_display ??
                              resumoDimensionamento.tipo_seccionamento ??
                              '—'
                            : '—'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  {projetoSelecionado ? (
                    <ProjetoIdentificacaoFluxo
                      embedded
                      projetoCodigo={projetoSelecionado.codigo}
                      projetoNome={projetoSelecionado.nome}
                      fallbackId={projetoIdListagem}
                      htmlId="carga-list-dim-resumo-projeto"
                    />
                  ) : (
                    <ProjetoIdentificacaoFluxo
                      embedded
                      fallbackId={projetoIdListagem}
                      htmlId="carga-list-dim-resumo-projeto"
                    />
                  )}
                  {resumoDimensionamento.atualizado_em ? (
                    <p className="small text-muted mb-0 mt-2">
                      Atualizado em{' '}
                      {new Date(resumoDimensionamento.atualizado_em).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
