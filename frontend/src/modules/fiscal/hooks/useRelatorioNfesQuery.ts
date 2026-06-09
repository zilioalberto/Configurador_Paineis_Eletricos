import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterRelatorioNfes } from '../services/fiscalNfeService'
import type { RelatorioNFeFiltros } from '../types/documentoFiscalRecebido'

export function useRelatorioNfesQuery(filtros: RelatorioNFeFiltros) {
  return useQuery({
    queryKey: fiscalQueryKeys.relatorioNfes(filtros),
    queryFn: () => obterRelatorioNfes(filtros),
  })
}
