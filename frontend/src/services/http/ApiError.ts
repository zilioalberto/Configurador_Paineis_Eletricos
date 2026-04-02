export type ApiErrorOptions = {
  status?: number | null
  code?: string
  details?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number | null
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, options?: ApiErrorOptions) {
    super(message, options?.cause instanceof Error ? { cause: options.cause } : undefined)
    this.name = 'ApiError'
    this.status = options?.status ?? null
    this.code = options?.code
    this.details = options?.details
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
  }
}
