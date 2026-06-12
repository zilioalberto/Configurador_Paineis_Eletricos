import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { listarNfesEmitidas } from '../services/fiscalNfeService'
import type { NfesEmitidasFiltros } from '../types/documentoFiscalRecebido'

export function useNfesEmitidasListQuery(
  filtros: NfesEmitidasFiltros,
  page = 1,
  pageSize = 50,
  ordering = '-data_emissao',
) {
  return useQuery({
    queryKey: fiscalQueryKeys.nfesEmitidas(filtros, page, pageSize, ordering),
    queryFn: () => listarNfesEmitidas(filtros, page, pageSize, ordering),
  })
}
