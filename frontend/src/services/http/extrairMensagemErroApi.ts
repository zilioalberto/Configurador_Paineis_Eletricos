import { isAxiosError } from 'axios'
import { ApiError } from './ApiError'
import { parseErrorResponseBody } from './parseErrorResponseBody'

/**
 * Mensagem amigável para exibir ao usuário (UI, toasts).
 * Erros vindos do `apiClient` já chegam como {@link ApiError} após o interceptor.
 */
export function extrairMensagemErroApi(error: unknown): string {
  if (ApiError.isApiError(error)) {
    return error.message
  }

  if (isAxiosError(error) && error.response?.data !== undefined) {
    return parseErrorResponseBody(error.response.data)
  }

  if (isAxiosError(error) && error.request && !error.response) {
    return 'Não foi possível conectar ao servidor. Verifique se a API está em execução.'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return ''
}
