import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { listarProdutos } from '../services/produtoService'

/** Query paginada de produtos com filtro opcional por categoria. */
export function useProdutoListQuery(
  categoriaId?: string | null,
  page = 1,
  pageSize = 50,
  search?: string | null,
) {
  return useQuery({
    queryKey: catalogoQueryKeys.produtos(categoriaId, page, pageSize, search),
    queryFn: () => listarProdutos(categoriaId, page, pageSize, search),
  })
}
