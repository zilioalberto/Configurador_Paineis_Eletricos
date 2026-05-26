import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { atualizarServico, criarServico, excluirServico } from '../services/servicoService'

export function useCreateServicoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => criarServico(body),
    onSuccess: (servico) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.setQueryData(catalogoQueryKeys.servico(servico.id), servico)
    },
  })
}

export function useUpdateServicoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => atualizarServico(id, body),
    onSuccess: (servico) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.setQueryData(catalogoQueryKeys.servico(servico.id), servico)
    },
  })
}

export function useDeleteServicoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => excluirServico(id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.removeQueries({ queryKey: catalogoQueryKeys.servico(deletedId) })
    },
  })
}
