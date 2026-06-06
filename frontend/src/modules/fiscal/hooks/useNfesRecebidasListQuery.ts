import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { listarNfesRecebidas } from '../services/fiscalNfeService'
import type { NfesRecebidasFiltros } from '../types/documentoFiscalRecebido'

export function useNfesRecebidasListQuery(
  filtros: NfesRecebidasFiltros,
  page = 1,
  pageSize = 50,
) {
  return useQuery({
    queryKey: fiscalQueryKeys.nfesRecebidas(filtros, page, pageSize),
    queryFn: () => listarNfesRecebidas(filtros, page, pageSize),
  })
}
