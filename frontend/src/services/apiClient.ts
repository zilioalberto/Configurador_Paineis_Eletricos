import axios, { type AxiosError } from 'axios'
import { normalizeAxiosError } from '@/services/http/normalizeAxiosError'

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_API_AUTH_TOKEN
  if (typeof token === 'string' && token.length > 0) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(normalizeAxiosError(error))
)

export default apiClient
