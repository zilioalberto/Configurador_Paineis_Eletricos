import { useQuery } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../dashboardQueryKeys'
import { obterDashboardResumo } from '../services/dashboardService'

export function useDashboardResumoQuery() {
  return useQuery({
    queryKey: dashboardQueryKeys.resumo(),
    queryFn: obterDashboardResumo,
    staleTime: 60_000,
  })
}
