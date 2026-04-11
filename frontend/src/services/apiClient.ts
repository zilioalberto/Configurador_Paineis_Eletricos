import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { refreshAccessToken } from '@/modules/auth/refreshAccessToken'
import { tokenStorage } from '@/modules/auth/tokenStorage'
import { getApiBaseUrl } from '@/services/apiBaseUrl'
import { normalizeAxiosError } from '@/services/http/normalizeAxiosError'

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
})

function resolveBearerToken(): string | null {
  const stored = tokenStorage.getAccess()
  if (stored) return stored
  const env = import.meta.env.VITE_API_AUTH_TOKEN
  if (typeof env === 'string' && env.length > 0) return env
  return null
}

apiClient.interceptors.request.use((config) => {
  const token = resolveBearerToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    const status = error.response?.status
    const url = originalRequest.url ?? ''
    const treatLikeUnauthorized =
      status === 401 || (status === 403 && url.includes('auth/me'))

    if (!originalRequest || !treatLikeUnauthorized) {
      return Promise.reject(normalizeAxiosError(error))
    }

    if (url.includes('auth/token')) {
      tokenStorage.clear()
      return Promise.reject(normalizeAxiosError(error))
    }

    if (originalRequest._retry) {
      tokenStorage.clear()
      return Promise.reject(normalizeAxiosError(error))
    }

    originalRequest._retry = true

    try {
      const access = await refreshAccessToken()
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access}`
      }
      return apiClient(originalRequest)
    } catch {
      return Promise.reject(normalizeAxiosError(error))
    }
  }
)

export default apiClient
