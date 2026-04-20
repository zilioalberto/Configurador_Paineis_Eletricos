import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import ProjetoTable from '../components/ProjetoTable'
import { useProjetoListQuery } from '../hooks/useProjetoListQuery'
import { useDeleteProjetoMutation } from '../hooks/useProjetoMutations'

type DeleteTarget = {
  id: string
  label: string
}

export default function ProjetoListPage() {
  const { user } = useAuth()
  const {
    data: projetos = [],
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useProjetoListQuery()
  const deleteMutation = useDeleteProjetoMutation()
  const { showToast } = useToast()

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)
  const canEditProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EDITAR)
  const canDeleteProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_EXCLUIR)

  const onDeleteRequest = useCallback(
    (id: string) => {
      const projeto = projetos.find((p) => p.id === id)
      const label =
        projeto?.nome?.trim() ||
        projeto?.codigo?.trim() ||
        'este projeto'
      setDeleteTarget({ id, label })
    },
    [projetos]
  )

  const closeModal = useCallback(() => {
    if (!deleteMutation.isPending) {
      setDeleteTarget(null)
    }
  }, [deleteMutation.isPending])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      showToast({
        variant: 'success',
        message: 'Projeto excluído com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao excluir projeto:', err)
      setDeleteTarget(null)
      const mensagem = extrairMensagemErroApi(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: mensagem || 'Tente novamente em instantes.',
      })
    }
  }, [deleteTarget, deleteMutation, showToast])

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir projeto"
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
          <h1 className="h3 mb-1">Projetos</h1>
          <p className="text-muted mb-0">
            Gerencie os projetos do configurador de painéis.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void refetch()}
          >
            Atualizar
          </button>

          {canCreateProjeto ? (
            <Link to="/projetos/novo" className="btn btn-primary">
              Novo Projeto
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isPending && <p className="mb-0">Carregando projetos...</p>}

          {!isPending && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {loadError instanceof Error
                ? loadError.message
                : 'Não foi possível carregar os projetos.'}
            </div>
          )}

          {!isPending && !isError && (
            <ProjetoTable
              projetos={projetos}
              onDeleteRequest={onDeleteRequest}
              canEdit={canEditProjeto}
              canDelete={canDeleteProjeto}
            />
          )}
        </div>
      </div>
    </div>
  )
}
