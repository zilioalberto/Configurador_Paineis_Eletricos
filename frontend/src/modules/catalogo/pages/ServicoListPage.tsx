import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ServicoTable from '../components/ServicoTable'
import { catalogoPaths } from '../catalogoPaths'
import { useDeleteServicoMutation } from '../hooks/useServicoMutations'
import { useServicoListQuery } from '../hooks/useServicoListQuery'

type DeleteTarget = { id: string; label: string }

export default function ServicoListPage() {
  const { user } = useAuth()
  const [paginaAtual, setPaginaAtual] = useState(1)
  const pageSize = 50
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const canManage = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)

  const {
    data: pageData,
    isPending: loading,
    isError,
    error: loadError,
    refetch,
  } = useServicoListQuery(paginaAtual, pageSize)
  const servicos = pageData?.items ?? []
  const deleteMutation = useDeleteServicoMutation()

  const onDeleteRequest = useCallback(
    (id: string) => {
      const s = servicos.find((x) => x.id === id)
      setDeleteTarget({
        id,
        label: s?.descricao?.trim() || s?.codigo?.trim() || 'este serviço',
      })
    },
    [servicos]
  )

  const closeModal = useCallback(() => {
    if (!deleteMutation.isPending) setDeleteTarget(null)
  }, [deleteMutation.isPending])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast({ variant: 'success', message: 'Serviço excluído com sucesso.' })
    } catch (err) {
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
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Serviços</h1>
          <p className="text-muted mb-0">
            Catálogo de serviços prestados para uso em propostas comerciais.
          </p>
        </div>
        {canManage ? (
          <Link to={catalogoPaths.servicoNovo} className="btn btn-primary">
            Novo serviço
          </Link>
        ) : null}
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? <p className="text-muted mb-0">Carregando serviços…</p> : null}
          {isError ? (
            <div className="alert alert-danger mb-0">
              {extrairMensagemErroApi(loadError) || 'Erro ao carregar serviços.'}
              <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </div>
          ) : null}
          {!loading && !isError ? (
            <>
              <ServicoTable servicos={servicos} canManage={canManage} onDeleteRequest={onDeleteRequest} />
              {pageData && pageData.total > pageSize ? (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="small text-muted">
                    Página {paginaAtual} · {pageData.total} serviço(s)
                  </span>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={!pageData.hasPrevious}
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={!pageData.hasNext}
                      onClick={() => setPaginaAtual((p) => p + 1)}
                    >
                      Seguinte
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir serviço"
        message={`Confirma a exclusão de ${deleteTarget?.label ?? 'este serviço'}?`}
        confirmLabel="Excluir"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onCancel={closeModal}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
