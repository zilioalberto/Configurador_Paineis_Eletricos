import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cargaQueryKeys } from '../cargaQueryKeys'
import {
  atualizarCarga,
  criarCarga,
  deletarCarga,
} from '../services/cargaService'

export function useCreateCargaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => criarCarga(body),
    onSuccess: (carga) => {
      void queryClient.invalidateQueries({ queryKey: cargaQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: cargaQueryKeys.list(carga.projeto),
      })
      queryClient.setQueryData(cargaQueryKeys.detail(carga.id), carga)
    },
  })
}

export function useUpdateCargaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Record<string, unknown>
    }) => atualizarCarga(id, body),
    onSuccess: (carga) => {
      void queryClient.invalidateQueries({ queryKey: cargaQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: cargaQueryKeys.list(carga.projeto),
      })
      queryClient.setQueryData(cargaQueryKeys.detail(carga.id), carga)
    },
  })
}

export function useDeleteCargaMutation(projetoId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletarCarga(id),
    onSuccess: (_void, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: cargaQueryKeys.all })
      if (projetoId) {
        void queryClient.invalidateQueries({
          queryKey: cargaQueryKeys.list(projetoId),
        })
      }
      queryClient.removeQueries({ queryKey: cargaQueryKeys.detail(deletedId) })
    },
  })
}
