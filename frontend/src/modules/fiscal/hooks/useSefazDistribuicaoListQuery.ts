import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { listarSefazDistribuicao } from '../services/fiscalNfeService'
import type { SefazDistribuicaoFiltros } from '../types/documentoFiscalRecebido'

export function useSefazDistribuicaoListQuery(
  filtros: SefazDistribuicaoFiltros,
  page = 1,
  pageSize = 50,
) {
  return useQuery({
    queryKey: fiscalQueryKeys.sefazDistribuicao(filtros, page, pageSize),
    queryFn: () => listarSefazDistribuicao(filtros, page, pageSize),
  })
}
