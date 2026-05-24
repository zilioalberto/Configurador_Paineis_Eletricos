import { useMutation, useQueryClient } from '@tanstack/react-query'
import { composicaoQueryKeys } from '@/modules/configurador_paineis/composicao/composicaoQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/configurador_paineis/dimensionamento/dimensionamentoQueryKeys'
import { cargaQueryKeys } from '../cargaQueryKeys'
import {
  atualizarCarga,
  criarCarga,
  deletarCarga,
} from '../services/cargaService'

/** Cria carga e invalida listagem, dimensionamento e composição do projeto. */
export function useCreateCargaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => criarCarga(body),
    onSuccess: (carga) => {
      void queryClient.invalidateQueries({ queryKey: cargaQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: cargaQueryKeys.list(carga.projeto),
      })
      void queryClient.invalidateQueries({
        queryKey: composicaoQueryKeys.snapshot(carga.projeto),
      })
      void queryClient.invalidateQueries({
        queryKey: dimensionamentoQueryKeys.porProjeto(carga.projeto),
      })
      queryClient.setQueryData(cargaQueryKeys.detail(carga.id), carga)
    },
  })
}

/** Atualiza carga e propaga invalidação para módulos dependentes. */
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
      void queryClient.invalidateQueries({
        queryKey: composicaoQueryKeys.snapshot(carga.projeto),
      })
      void queryClient.invalidateQueries({
        queryKey: dimensionamentoQueryKeys.porProjeto(carga.projeto),
      })
      queryClient.setQueryData(cargaQueryKeys.detail(carga.id), carga)
    },
  })
}

/** Exclui carga e limpa caches relacionados ao projeto. */
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
        void queryClient.invalidateQueries({
          queryKey: composicaoQueryKeys.snapshot(projetoId),
        })
        void queryClient.invalidateQueries({
          queryKey: dimensionamentoQueryKeys.porProjeto(projetoId),
        })
      }
      queryClient.removeQueries({ queryKey: cargaQueryKeys.detail(deletedId) })
    },
  })
}
