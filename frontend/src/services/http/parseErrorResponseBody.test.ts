import { describe, expect, it } from 'vitest'

import { parseErrorResponseBody } from './parseErrorResponseBody'

describe('parseErrorResponseBody', () => {
  it('retorna string vazia para null/undefined/número', () => {
    expect(parseErrorResponseBody(null)).toBe('')
    expect(parseErrorResponseBody(undefined)).toBe('')
    expect(parseErrorResponseBody(42)).toBe('')
  })

  it('normaliza string', () => {
    expect(parseErrorResponseBody('  erro  ')).toBe('erro')
  })

  it('usa detail string ou lista', () => {
    expect(parseErrorResponseBody({ detail: ' x ' })).toBe('x')
    expect(parseErrorResponseBody({ detail: ['a', 'b'] })).toBe('a | b')
  })

  it('usa non_field_errors', () => {
    expect(parseErrorResponseBody({ non_field_errors: ['n1', 'n2'] })).toBe('n1 | n2')
  })

  it('agrega campos com parseNested', () => {
    expect(
      parseErrorResponseBody({
        codigo: ['inválido'],
        extra: { nested: 'msg' },
      })
    ).toContain('codigo:')
    expect(
      parseErrorResponseBody({
        codigo: ['inválido'],
        extra: { nested: 'msg' },
      })
    ).toContain('extra:')
  })
})
