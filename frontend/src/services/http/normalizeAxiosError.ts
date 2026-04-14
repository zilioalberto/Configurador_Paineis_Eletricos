import { isAxiosError, type AxiosError } from 'axios'
import { ApiError } from './ApiError'
import { parseErrorResponseBody } from './parseErrorResponseBody'

/** Mensagens conhecidas de bibliotecas (ex.: JWT) antes da tradução no backend. */
const KNOWN_ENGLISH_API_MESSAGES: Record<string, string> = {
  'No active account found with the given credentials':
    'E-mail ou senha incorretos. Se a conta existir mas estiver inativa, fale com o administrador.',
}

function translateKnownApiMessage(message: string): string {
  const key = message.trim()
  return KNOWN_ENGLISH_API_MESSAGES[key] ?? message
}

function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Requisição inválida.'
    case 401:
      return 'Não autorizado. Faça login novamente.'
    case 403:
      return 'Você não tem permissão para esta operação.'
    case 404:
      return 'Recurso não encontrado.'
    case 409:
      return 'Conflito: o recurso não pôde ser atualizado.'
    case 422:
      return 'Não foi possível processar os dados enviados.'
    case 429:
      return 'Muitas requisições. Tente novamente em instantes.'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Erro no servidor. Tente novamente mais tarde.'
    default:
      return 'Não foi possível completar a operação.'
  }
}

export function normalizeAxiosError(error: unknown): ApiError {
  if (ApiError.isApiError(error)) {
    return error
  }

  if (!isAxiosError(error)) {
    return new ApiError('Erro inesperado.', { status: null, cause: error })
  }

  const ax = error as AxiosError

  if (ax.code === 'ECONNABORTED') {
    return new ApiError('A requisição excedeu o tempo limite.', {
      status: null,
      code: ax.code,
      cause: ax,
    })
  }

  if (ax.response) {
    const status = ax.response.status
    const body = ax.response.data
    const parsed = parseErrorResponseBody(body)
    const statusText =
      typeof ax.response.statusText === 'string' ? ax.response.statusText.trim() : ''

    const rawMessage = parsed || (statusText ? statusText : statusFallbackMessage(status))
    const message = translateKnownApiMessage(rawMessage)

    return new ApiError(message, {
      status,
      code: ax.code,
      details: body,
      cause: ax,
    })
  }

  if (ax.request) {
    return new ApiError(
      'Não foi possível conectar ao servidor. Verifique se a API está em execução.',
      { status: null, code: ax.code, cause: ax }
    )
  }

  return new ApiError(ax.message || 'Erro de rede.', {
    status: null,
    code: ax.code,
    cause: ax,
  })
}
