import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { obterProduto } from '../services/produtoService'

export function useProdutoDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: catalogoQueryKeys.produto(id ?? ''),
    queryFn: () => obterProduto(id!),
    enabled: Boolean(id),
  })
}
