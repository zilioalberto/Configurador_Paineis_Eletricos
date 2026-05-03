/**
 * Monta mensagem legível a partir do corpo de erro da API (ex.: Django REST Framework).
 */
export function parseErrorResponseBody(data: unknown): string {
  if (data === null || data === undefined) {
    return ''
  }

  if (typeof data === 'string') {
    return data.trim()
  }

  if (typeof data !== 'object') {
    return ''
  }

  const o = data as Record<string, unknown>

  function parseNested(value: unknown): string {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(String).join(', ')
    if (value !== null && typeof value === 'object') {
      const nested = parseErrorResponseBody(value)
      return nested || 'erro de validação'
    }
    return ''
  }

  if ('detail' in o) {
    const detail = o.detail
    if (typeof detail === 'string') {
      return detail.trim()
    }
    if (Array.isArray(detail)) {
      const parts = detail.filter((x): x is string => typeof x === 'string')
      if (parts.length) {
        return parts.join(' | ')
      }
    }
  }

  if ('non_field_errors' in o) {
    const v = o.non_field_errors
    if (Array.isArray(v)) {
      const parts = v.filter((x): x is string => typeof x === 'string')
      if (parts.length) {
        return parts.join(' | ')
      }
    }
  }

  const fieldParts = Object.entries(o)
    .filter(([key]) => key !== 'detail' && key !== 'non_field_errors')
    .map(([campo, valor]) => {
      const parsed = parseNested(valor)
      return parsed ? `${campo}: ${parsed}` : ''
    })
    .filter(Boolean)

  return fieldParts.join(' | ')
}
