import { describe, expect, it } from 'vitest'

import { formatProjetoCodigoNome } from './ProjetoIdentificacaoFluxo'

describe('formatProjetoCodigoNome', () => {
  it('combina código e nome com em-dash', () => {
    expect(formatProjetoCodigoNome('05004-26', 'Nome X')).toBe('05004-26 — Nome X')
  })

  it('usa só código ou só nome quando o outro falta', () => {
    expect(formatProjetoCodigoNome('C1', null)).toBe('C1')
    expect(formatProjetoCodigoNome('', 'Nome')).toBe('Nome')
  })

  it('usa fallback quando não há texto', () => {
    expect(formatProjetoCodigoNome(null, null, 'uuid-1')).toBe('uuid-1')
    expect(formatProjetoCodigoNome('', '', '')).toBe('—')
  })
})
