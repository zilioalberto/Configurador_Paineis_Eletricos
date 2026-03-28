import {
  type ChangeEvent,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaTable from '../components/CargaTable'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useDeleteCargaMutation } from '../hooks/useCargaMutations'

type DeleteTarget = { id: string; label: string }

export default function CargaListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const {
    data: cargas = [],
    isPending: loadingCargas,
    isError,
    error: loadError,
    refetch,
  } = useCargaListQuery(projetoId || null)

  const deleteMutation = useDeleteCargaMutation(projetoId || null)

  const projetoLabel = useMemo(() => {
    const p = projetos.find((x) => x.id === projetoId)
    return p ? `${p.codigo} — ${p.nome}` : ''
  }, [projetos, projetoId])

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
            disabled={!projetoId}
          >
            Atualizar
          </button>
          <Link
            to={
              projetoId
                ? `/cargas/novo?projeto=${encodeURIComponent(projetoId)}`
                : '/cargas/novo'
            }
            className={`btn btn-primary${!projetoId ? ' disabled' : ''}`}
            aria-disabled={!projetoId}
            onClick={(e) => {
              if (!projetoId) e.preventDefault()
            }}
          >
            Nova carga
          </Link>
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
            value={projetoId}
            onChange={onProjetoFilterChange}
            disabled={loadingProjetos}
          >
            <option value="">Selecione um projeto para listar as cargas</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nome}
              </option>
            ))}
          </select>
          {!loadingProjetos && projetos.length === 0 && (
            <p className="text-muted small mt-2 mb-0">
              Não há projetos cadastrados.{' '}
              <Link to="/projetos/novo">Criar projeto</Link>
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {!projetoId && (
            <p className="text-muted mb-0">
              Escolha um projeto acima para visualizar e gerenciar as cargas.
            </p>
          )}

          {projetoId && (
            <p className="small text-muted mb-3">
              Projeto: <strong>{projetoLabel || projetoId}</strong>
            </p>
          )}

          {projetoId && loadingCargas && (
            <p className="mb-0 text-muted">Carregando cargas...</p>
          )}

          {projetoId && !loadingCargas && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar as cargas.'}
            </div>
          )}

          {projetoId && !loadingCargas && !isError && (
            <CargaTable
              cargas={cargas}
              projetoId={projetoId}
              onDeleteRequest={onDeleteRequest}
            />
          )}
        </div>
      </div>
    </div>
  )
}
