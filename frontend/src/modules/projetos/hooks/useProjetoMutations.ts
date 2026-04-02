import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardQueryKeys } from '@/modules/dashboard/dashboardQueryKeys'
import { projetoQueryKeys } from '../projetoQueryKeys'
import {
  atualizarProjeto,
  criarProjeto,
  deletarProjeto,
} from '../services/projetoService'
import type { ProjetoFormData } from '../types/projeto'

export function useCreateProjetoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProjetoFormData) => criarProjeto(data),
    onSuccess: (projeto) => {
      void queryClient.invalidateQueries({ queryKey: projetoQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      queryClient.setQueryData(projetoQueryKeys.detail(projeto.id), projeto)
    },
  })
}

export function useUpdateProjetoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjetoFormData }) =>
      atualizarProjeto(id, data),
    onSuccess: (projeto) => {
      void queryClient.invalidateQueries({ queryKey: projetoQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      queryClient.setQueryData(projetoQueryKeys.detail(projeto.id), projeto)
    },
  })
}

export function useDeleteProjetoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deletarProjeto(id),
    onSuccess: (_void, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: projetoQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      queryClient.removeQueries({ queryKey: projetoQueryKeys.detail(deletedId) })
    },
  })
}
