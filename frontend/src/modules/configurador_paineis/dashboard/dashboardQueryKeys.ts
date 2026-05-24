/** Chaves React Query do módulo dashboard. */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  resumo: () => [...dashboardQueryKeys.all, 'resumo'] as const,
}
