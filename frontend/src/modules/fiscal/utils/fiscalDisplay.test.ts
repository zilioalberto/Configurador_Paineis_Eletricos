import { describe, expect, it } from 'vitest'

import { formatChaveAcesso, formatCnpjExibicao, labelOrigemImportacao } from './fiscalDisplay'

describe('fiscalDisplay', () => {
  it('formata CNPJ de 14 dígitos', () => {
    expect(formatCnpjExibicao('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('formata chave de acesso em blocos', () => {
    expect(formatChaveAcesso('12345678901234567890123456789012345678901234')).toMatch(
      /^1234 5678/,
    )
  })

  it('rotula origem PONTE_A3', () => {
    expect(labelOrigemImportacao('PONTE_A3')).toContain('SEFAZ')
  })
})
