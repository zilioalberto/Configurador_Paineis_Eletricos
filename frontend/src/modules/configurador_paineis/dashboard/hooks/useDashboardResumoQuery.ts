import { useQuery } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../dashboardQueryKeys'
import { obterDashboardResumo } from '../services/dashboardService'

/** Query do resumo agregado do dashboard (cache de 60 s). */
export function useDashboardResumoQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.resumo(),
    queryFn: obterDashboardResumo,
    staleTime: 60_000,
  })
}
