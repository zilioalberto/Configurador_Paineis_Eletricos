import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarProdutos } from '../services/produtoService'

export function useProdutoListQuery(categoriaId?: string | null) {
  return useQuery({
    queryKey: catalogoQueryKeys.produtos(categoriaId),
    queryFn: () => listarProdutos(categoriaId),
  })
}
