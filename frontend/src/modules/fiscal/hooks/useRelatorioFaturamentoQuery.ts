import { useQuery } from '@tanstack/react-query'

import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { obterRelatorioFaturamento } from '../services/fiscalSimplesService'
import type { RelatorioFaturamentoFiltros } from '../types/relatorioFaturamento'

export function useRelatorioFaturamentoQuery(filtros: RelatorioFaturamentoFiltros) {
  return useQuery({
    queryKey: fiscalQueryKeys.relatorioFaturamento(filtros),
    queryFn: () => obterRelatorioFaturamento(filtros),
  })
}
