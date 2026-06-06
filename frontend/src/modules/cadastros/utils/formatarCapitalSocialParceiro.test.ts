import { describe, expect, it } from 'vitest'

import { formatarCapitalSocialParceiro } from './formatarCapitalSocialParceiro'

describe('formatarCapitalSocialParceiro', () => {
  it('retorna traço para valores vazios', () => {
    expect(formatarCapitalSocialParceiro(null)).toBe('—')
    expect(formatarCapitalSocialParceiro('')).toBe('—')
  })

  it('formata número em moeda BRL', () => {
    const fmt = formatarCapitalSocialParceiro('1500000.50')
    expect(fmt).toContain('R$')
    expect(fmt).toMatch(/1\.500\.000,50|1\.500\.000,5/)
  })

  it('devolve texto original quando não é número', () => {
    expect(formatarCapitalSocialParceiro('sob consulta')).toBe('sob consulta')
  })
})
