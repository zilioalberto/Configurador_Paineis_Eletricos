import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
} from '../services/produtoService'

export function useCreateProdutoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => criarProduto(body),
    onSuccess: (produto) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.setQueryData(catalogoQueryKeys.produto(produto.id), produto)
    },
  })
}

export function useUpdateProdutoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      atualizarProduto(id, body),
    onSuccess: (produto) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.setQueryData(catalogoQueryKeys.produto(produto.id), produto)
    },
  })
}

export function useDeleteProdutoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => excluirProduto(id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: catalogoQueryKeys.all })
      queryClient.removeQueries({ queryKey: catalogoQueryKeys.produto(deletedId) })
    },
  })
}
