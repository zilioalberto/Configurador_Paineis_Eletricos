import { useCallback, useState } from 'react'
import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import type { CargaListItem } from '../types/carga'
import type { useDeleteCargaMutation } from '../hooks/useCargaMutations'

type DeleteTarget = { id: string; label: string }

/**
 * Encapsula o fluxo de exclusão de carga (alvo, confirmação e feedback),
 * reduzindo a complexidade da página de listagem.
 */
export function useCargaListDelete(
  cargas: CargaListItem[],
  deleteMutation: ReturnType<typeof useDeleteCargaMutation>
) {
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

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

  return { deleteTarget, onDeleteRequest, closeModal, confirmDelete }
}
