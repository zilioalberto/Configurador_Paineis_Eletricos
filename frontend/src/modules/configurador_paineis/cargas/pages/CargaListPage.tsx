/** Listagem de cargas por projeto com resumo de dimensionamento. */

import { type ChangeEvent, useCallback, useEffect, useMemo } from 'react'
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
import { CargasCadastradasPanel } from '../components/CargasCadastradasPanel'
import { DimensionamentoResumoCard } from '../components/DimensionamentoResumoCard'
import { EditarCargaModal } from '../components/EditarCargaModal'
import { NovaCargaModal } from '../components/NovaCargaModal'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useDeleteCargaMutation } from '../hooks/useCargaMutations'
import { useCargaListAutoRecalc } from '../hooks/useCargaListAutoRecalc'
import { useCargaListDelete } from '../hooks/useCargaListDelete'
import { useCargaListModais } from '../hooks/useCargaListModais'
import {
  filtrarProjetosComEdicaoCargas,
  projetoPermiteEdicaoCargas,
} from '../utils/projetoEdicaoCargas'

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
  const { deleteTarget, onDeleteRequest, closeModal, confirmDelete } = useCargaListDelete(
    cargas,
    deleteMutation
  )

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
      setSearchParams(v ? { projeto: v } : {})
    },
    [setSearchParams]
  )

  const {
    cargaEmEdicaoId,
    novaCargaModalAberto,
    editarCargaModalAberto,
    abrirNovaCargaModal,
    fecharNovaCargaModal,
    abrirEditarCargaModal,
    fecharEditarCargaModal,
  } = useCargaListModais(searchParams, setSearchParams, projetoIdListagem)

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
        <CargasCadastradasPanel
          cargas={cargas}
          loadingCargas={loadingCargas}
          isError={isError}
          loadError={loadError}
          canManageCargas={canManageCargas}
          projetoId={projetoIdListagem}
          onNovaCarga={abrirNovaCargaModal}
          onDeleteRequest={onDeleteRequest}
          onEditRequest={abrirEditarCargaModal}
        />
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
