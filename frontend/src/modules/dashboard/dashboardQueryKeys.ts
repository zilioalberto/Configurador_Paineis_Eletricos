export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  resumo: () => [...dashboardQueryKeys.all, 'resumo'] as const,
}
