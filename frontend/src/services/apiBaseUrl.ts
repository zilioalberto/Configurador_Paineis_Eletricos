/** Base da API REST (inclui `/api/v1`, sem barra final). */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

  if (typeof window === 'undefined') {
    return configured
  }

  return resolveApiBaseUrl(configured, window.location.hostname)
}

export function resolveApiBaseUrl(configured: string, pageHost: string): string {
  const isLocalPage = pageHost === 'localhost' || pageHost === '127.0.0.1'
  const pointsToLocalApi = configured.includes('://localhost:') || configured.includes('://127.0.0.1:')

  if (!isLocalPage && pointsToLocalApi) {
    return 'https://api.zfw.com.br/api/v1'
  }

  return configured
}
