import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
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
  const canManageCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)

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
    refetch,
  } = useCargaListQuery(projetoIdListagem)

  const deleteMutation = useDeleteCargaMutation(projetoIdListagem)

  const projetoLabel = useMemo(() => {
    const p = projetoSelecionado
    return p ? `${p.codigo} — ${p.nome}` : ''
  }, [projetoSelecionado])

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

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Cargas</h1>
          <p className="text-muted mb-0">
            Cadastre cargas vinculadas a um projeto (motores, válvulas, sensores,
            etc.).
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void refetch()}
            disabled={!projetoIdListagem}
          >
            Atualizar
          </button>
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

      <div className="card">
        <div className="card-body">
          {!projetoIdListagem && !projetoFinalizado && (
            <p className="text-muted mb-0">
              Escolha um projeto acima para visualizar e gerenciar as cargas.
            </p>
          )}

          {projetoFinalizado && (
            <div className="alert alert-secondary mb-0" role="status">
              Este projeto está finalizado. A lista de cargas deste projeto não
              está disponível para gestão nesta tela.
            </div>
          )}

          {projetoIdListagem && (
            <p className="small text-muted mb-3">
              Projeto: <strong>{projetoLabel || projetoIdListagem}</strong>
            </p>
          )}

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
    </div>
  )
}
