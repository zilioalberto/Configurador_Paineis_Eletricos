import { useQuery } from '@tanstack/react-query'
import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { obterProduto } from '../services/produtoService'

/** Query do detalhe de produto (especificação + fiscal). */
export function useProdutoDetailQuery(id: string | undefined) {
  return useQuery({
    queryKey: catalogoQueryKeys.produto(id ?? ''),
    queryFn: () => obterProduto(id!),
    enabled: Boolean(id),
  })
}
