import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarProdutos } from '../services/produtoService'

export function useProdutoListQuery(categoriaId?: string | null, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: catalogoQueryKeys.produtos(categoriaId, page, pageSize),
    queryFn: () => listarProdutos(categoriaId, page, pageSize),
  })
}
