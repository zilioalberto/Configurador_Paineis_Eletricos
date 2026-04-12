/** Base da API REST (inclui `/api/v1`, sem barra final). */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
}
