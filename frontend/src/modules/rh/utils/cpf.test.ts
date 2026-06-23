import { describe, expect, it } from 'vitest'

import { aplicarMascaraCpf, apenasDigitosCpf, validarCpf } from './cpf'

describe('cpf', () => {
  it('aplica máscara durante a digitação', () => {
    expect(aplicarMascaraCpf('39053344705')).toBe('390.533.447-05')
  })

  it('valida CPF conhecido', () => {
    expect(validarCpf('390.533.447-05')).toBeNull()
    expect(apenasDigitosCpf('390.533.447-05')).toBe('39053344705')
  })

  it('rejeita CPF inválido', () => {
    expect(validarCpf('123.456.789-00')).toBe('CPF inválido (dígitos verificadores).')
    expect(validarCpf('111.111.111-11')).toBe('CPF inválido.')
  })

  it('aceita campo vazio', () => {
    expect(validarCpf('')).toBeNull()
  })
})
