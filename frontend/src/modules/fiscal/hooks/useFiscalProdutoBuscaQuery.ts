import { useQuery } from '@tanstack/react-query'
import { buscarProdutosAutocomplete } from '@/modules/catalogo/services/produtoService'
import { fiscalQueryKeys } from '../fiscalQueryKeys'

/** Busca produtos ativos por código / descrição / fabricante (API catálogo, mín. 1 carácter). */
export function useFiscalProdutoBuscaQuery(consultaDebounced: string) {
  const q = consultaDebounced.trim()
  return useQuery({
    queryKey: fiscalQueryKeys.produtoBuscaFiscal(q),
    queryFn: () => buscarProdutosAutocomplete(q, null, 1),
    enabled: q.length >= 1,
    staleTime: 20_000,
  })
}
