import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cargaQueryKeys } from '@/modules/configurador_paineis/cargas/cargaQueryKeys'
import { composicaoQueryKeys } from '@/modules/configurador_paineis/composicao/composicaoQueryKeys'
import { dashboardQueryKeys } from '@/modules/configurador_paineis/dashboard/dashboardQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/configurador_paineis/dimensionamento/dimensionamentoQueryKeys'
import { projetoQueryKeys } from '../projetoQueryKeys'
import {
  atualizarProjeto,
  criarProjeto,
  deletarProjeto,
} from '../services/projetoService'
import type { Projeto, ProjetoFormData } from '../types/projeto'

/** Cria projeto e invalida listagens e dashboard. */
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

/**
 * Atualiza projeto; se a tensão nominal mudar, invalida cargas,
 * dimensionamento e composição (efeito espelhado do backend).
 */
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

/** Remove projeto e limpa cache de detalhe. */
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
