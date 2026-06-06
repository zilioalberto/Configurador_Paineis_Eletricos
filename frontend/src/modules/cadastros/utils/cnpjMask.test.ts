import { describe, expect, it } from 'vitest'

import { aplicarMascaraCnpj, apenasDigitosCnpj } from './cnpjMask'

describe('cnpjMask', () => {
  it('limita a 14 dígitos', () => {
    expect(apenasDigitosCnpj('12.345.678/9012-345678')).toBe('12345678901234')
  })

  it('aplica máscara progressivamente', () => {
    expect(aplicarMascaraCnpj('19')).toBe('19')
    expect(aplicarMascaraCnpj('19131')).toBe('19.131')
    expect(aplicarMascaraCnpj('191312430')).toBe('19.131.243/0')
    expect(aplicarMascaraCnpj('19131243000197')).toBe('19.131.243/0001-97')
  })
})
