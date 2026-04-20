import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cargaQueryKeys } from '@/modules/cargas/cargaQueryKeys'
import { composicaoQueryKeys } from '@/modules/composicao/composicaoQueryKeys'
import { dashboardQueryKeys } from '@/modules/dashboard/dashboardQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/dimensionamento/dimensionamentoQueryKeys'
import { projetoQueryKeys } from '../projetoQueryKeys'
import {
  atualizarProjeto,
  criarProjeto,
  deletarProjeto,
} from '../services/projetoService'
import type { Projeto, ProjetoFormData } from '../types/projeto'

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
    onSuccess: (projeto, { id }) => {
      const anterior = queryClient.getQueryData<Projeto>(projetoQueryKeys.detail(id))
      void queryClient.invalidateQueries({ queryKey: projetoQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all })
      queryClient.setQueryData(projetoQueryKeys.detail(projeto.id), projeto)

      const tensaoMudou = anterior?.tensao_nominal !== projeto.tensao_nominal
      if (tensaoMudou) {
        void queryClient.invalidateQueries({
          queryKey: cargaQueryKeys.list(projeto.id),
        })
        void queryClient.invalidateQueries({
          queryKey: dimensionamentoQueryKeys.porProjeto(projeto.id),
        })
        void queryClient.invalidateQueries({
          queryKey: composicaoQueryKeys.snapshot(projeto.id),
        })
        void queryClient.invalidateQueries({ queryKey: cargaQueryKeys.all })
      }
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
