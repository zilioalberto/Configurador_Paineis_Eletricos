/** Listagem de cargas por projeto com resumo de dimensionamento. */

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppPageToolbar } from '@/components/layout/AppPageToolbarContext'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'
import { useRecalcularDimensionamentoMutation } from '@/modules/configurador_paineis/dimensionamento/hooks/useRecalcularDimensionamentoMutation'
import { useProjetoDetailQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoDetailQuery'
import { useProjetoListQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery'
import type { Projeto } from '@/modules/configurador_paineis/projetos/types/projeto'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaTable from '../components/CargaTable'
import { CargasEmptyState } from '../components/CargasEmptyState'
import { DimensionamentoResumoCard } from '../components/DimensionamentoResumoCard'
import { EditarCargaModal } from '../components/EditarCargaModal'
import { NovaCargaModal } from '../components/NovaCargaModal'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useDeleteCargaMutation } from '../hooks/useCargaMutations'
import { useCargaListAutoRecalc } from '../hooks/useCargaListAutoRecalc'
import {
  filtrarProjetosComEdicaoCargas,
  projetoPermiteEdicaoCargas,
} from '../utils/projetoEdicaoCargas'

type DeleteTarget = { id: string; label: string }

function ProjetoFiltroCard({
  projetoId,
  projetoFinalizado,
  loadingProjetos,
  projetos,
  projetosNoFiltro,
  canCreateProjeto,
  onProjetoFilterChange,
}: Readonly<{
  projetoId: string
  projetoFinalizado: boolean
  loadingProjetos: boolean
  projetos: Projeto[]
  projetosNoFiltro: Projeto[]
  canCreateProjeto: boolean
  onProjetoFilterChange: (e: ChangeEvent<HTMLSelectElement>) => void
}>) {
  if (projetoId) return null

  return (
    <div className="card mb-3">
      <div className="card-body">
        <label className="form-label fw-semibold" htmlFor="filtro-projeto-cargas">
          Configuração de painel
        </label>
        <select
          id="filtro-projeto-cargas"
          className="form-select"
          style={{ maxWidth: '28rem' }}
          value={projetoFinalizado ? '' : projetoId}
          onChange={onProjetoFilterChange}
          disabled={loadingProjetos}
        >
          <option value="">Selecione uma configuração para listar as cargas</option>
          {projetosNoFiltro.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.nome}
            </option>
          ))}
        </select>
        {!loadingProjetos && projetos.length === 0 ? (
          <p className="text-muted small mt-2 mb-0">
            Não há configurações cadastradas.{' '}
            {canCreateProjeto ? <Link to={configuradorPaths.novaConfiguracao}>Criar configuração</Link> : null}
          </p>
        ) : null}
        {!loadingProjetos && projetos.length > 0 && projetosNoFiltro.length === 0 ? (
          <p className="text-muted small mt-2 mb-0">
            Não há configurações em andamento disponíveis para edição de cargas.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default function CargaListPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const canManageCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)
  const canEditarProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()

  const {
    data: projetoDetalhe,
    isPending: loadingProjetoDetalhe,
    isError: erroProjetoDetalhe,
  } = useProjetoDetailQuery(projetoId || undefined)

  const projetoSelecionado = useMemo(
    () =>
      projetoId
        ? projetos.find((p) => p.id === projetoId) ?? projetoDetalhe
        : undefined,
    [projetos, projetoId, projetoDetalhe]
  )
  const projetoFinalizado = Boolean(
    projetoSelecionado && !projetoPermiteEdicaoCargas(projetoSelecionado)
  )
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

  const autoRecalcFeedback = useCargaListAutoRecalc({
    projetoIdListagem,
    podeRecalcular: podeRecalcularDimensionamento,
    loadingCargas,
    isError,
    cargasSignature,
    recalcMutation,
  })

  useEffect(() => {
    if (!projetoId || loadingProjetos || projetos.length === 0) return
    const sel = projetos.find((p) => p.id === projetoId)
    if (sel?.status === 'FINALIZADO') {
      setSearchParams({}, { replace: true })
      showToast({
        variant: 'warning',
        message:
          'Configurações finalizadas não podem ser usadas para gerenciar cargas.',
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

  const onDeleteRequest = useCallback(
    (id: string) => {
      const c = cargas.find((x) => x.id === id)
      setDeleteTarget({
        id,
        label: c?.tag?.trim() || c?.descricao?.trim() || 'esta carga',
      })
    },
    [cargas]
  )

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

  const [novaCargaAberta, setNovaCargaAberta] = useState(() => searchParams.get('novo') === '1')
  const [cargaEmEdicaoId, setCargaEmEdicaoId] = useState<string | null>(
    () => searchParams.get('editar') || null
  )

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return
    setNovaCargaAberta(true)
    setCargaEmEdicaoId(null)
    const params = new URLSearchParams(searchParams)
    params.delete('novo')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const editar = searchParams.get('editar')
    if (!editar) return
    setCargaEmEdicaoId(editar)
    setNovaCargaAberta(false)
    const params = new URLSearchParams(searchParams)
    params.delete('editar')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const novaCargaModalAberto = novaCargaAberta && Boolean(projetoIdListagem)
  const editarCargaModalAberto = Boolean(cargaEmEdicaoId) && Boolean(projetoIdListagem)

  const abrirNovaCargaModal = useCallback(() => {
    if (!projetoIdListagem) return
    setCargaEmEdicaoId(null)
    setNovaCargaAberta(true)
  }, [projetoIdListagem])

  const fecharNovaCargaModal = useCallback(() => {
    setNovaCargaAberta(false)
  }, [])

  const abrirEditarCargaModal = useCallback(
    (cargaId: string) => {
      if (!projetoIdListagem) return
      setNovaCargaAberta(false)
      setCargaEmEdicaoId(cargaId)
    },
    [projetoIdListagem]
  )

  const fecharEditarCargaModal = useCallback(() => {
    setCargaEmEdicaoId(null)
  }, [])

  const toolbarActions = useMemo(() => {
    if (!projetoIdListagem) return null
    const hrefDimensionamento = withFluxoOrigem(
      configuradorPaths.dimensionamento(projetoIdListagem),
      searchParams
    )
    return (
      <>
        {canEditarProjeto ? (
          <Link
            to={configuradorPaths.configuracaoEditar(projetoIdListagem)}
            className="btn btn-outline-light btn-sm"
          >
            Editar configuração
          </Link>
        ) : null}
        {canManageCargas ? (
          <Link to={hrefDimensionamento} className="btn btn-success btn-sm">
            Salvar cargas
          </Link>
        ) : null}
      </>
    )
  }, [canEditarProjeto, canManageCargas, projetoIdListagem, searchParams])

  const toolbarConfig = useMemo(() => {
    if (!projetoIdListagem) {
      return {
        title: 'Cargas do projeto',
        subtitle: 'Selecione uma configuração de painel para gerir as cargas',
      }
    }

    return {
      title: 'Cargas do projeto',
      actions: toolbarActions,
    }
  }, [projetoIdListagem, toolbarActions])

  useAppPageToolbar(toolbarConfig)

  return (
    <div className="container-fluid carga-list-page">
      {projetoIdListagem ? (
        <NovaCargaModal
          show={novaCargaModalAberto}
          projetoId={projetoIdListagem}
          onClose={fecharNovaCargaModal}
        />
      ) : null}

      {projetoIdListagem && cargaEmEdicaoId ? (
        <EditarCargaModal
          show={editarCargaModalAberto}
          cargaId={cargaEmEdicaoId}
          projetoId={projetoIdListagem}
          onClose={fecharEditarCargaModal}
        />
      ) : null}

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

      {projetoId && !projetoSelecionado && loadingProjetoDetalhe ? (
        <p className="text-muted mb-3">Carregando configuração…</p>
      ) : null}

      {projetoId && !projetoSelecionado && erroProjetoDetalhe && !loadingProjetoDetalhe ? (
        <div className="alert alert-danger mb-3" role="alert">
          Não foi possível carregar esta configuração.{' '}
          <Link to={configuradorPaths.configuracoes}>Voltar à lista</Link>.
        </div>
      ) : null}

      <ProjetoFiltroCard
        projetoId={projetoId}
        projetoFinalizado={projetoFinalizado}
        loadingProjetos={loadingProjetos}
        projetos={projetos}
        projetosNoFiltro={projetosNoFiltro}
        canCreateProjeto={canCreateProjeto}
        onProjetoFilterChange={onProjetoFilterChange}
      />

      {projetoFinalizado ? (
        <div className="alert alert-secondary" role="status">
          Esta configuração está finalizada. A gestão de cargas não está disponível.
        </div>
      ) : null}

      {projetoIdListagem ? (
        <div className="card carga-list-panel">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h2 className="h6 mb-0">Cargas cadastradas</h2>
                {!loadingCargas && !isError ? (
                  <p className="small text-muted mb-0">
                    {cargas.length} {cargas.length === 1 ? 'carga' : 'cargas'}
                  </p>
                ) : null}
              </div>
              {canManageCargas ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={abrirNovaCargaModal}
                >
                  Nova carga
                </button>
              ) : null}
            </div>

            {loadingCargas ? <p className="mb-0 text-muted">Carregando cargas…</p> : null}

            {!loadingCargas && isError ? (
              <div className="alert alert-danger mb-0" role="alert">
                {loadError instanceof Error ? loadError.message : 'Não foi possível carregar as cargas.'}
              </div>
            ) : null}

            {!loadingCargas && !isError && cargas.length === 0 ? (
              <CargasEmptyState
                canManage={canManageCargas}
                onNovaCarga={abrirNovaCargaModal}
              />
            ) : null}

            {!loadingCargas && !isError && cargas.length > 0 ? (
              <CargaTable
                cargas={cargas}
                projetoId={projetoIdListagem}
                onDeleteRequest={onDeleteRequest}
                onEditRequest={abrirEditarCargaModal}
                canManage={canManageCargas}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {projetoIdListagem ? (
        <DimensionamentoResumoCard
          resumo={resumoDimensionamento}
          loading={loadingResumoDimensionamento}
          isError={isResumoError}
          error={resumoError}
          totalCargas={cargas.length}
          autoRecalcFeedback={autoRecalcFeedback}
        />
      ) : null}
    </div>
  )
}
