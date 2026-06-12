import { describe, expect, it } from 'vitest'

import {
  dataLocalIso,
  formatChaveAcesso,
  formatCnpjExibicao,
  labelAnexoSimples,
  labelIncluirFaturamento,
  labelOrigemImportacao,
  periodoUltimos12MesesLocal,
} from './fiscalDisplay'

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
    expect(labelOrigemImportacao('PONTE_A3')).toContain('Ponte A3')
  })

  it('rotula compoe faturamento', () => {
    expect(labelIncluirFaturamento(true)).toBe('Compõe faturamento')
    expect(labelIncluirFaturamento(false)).toBe('Não compõe')
  })

  it('rotula anexo SERVICO e vazio como serviço Fator R', () => {
    expect(labelAnexoSimples('SERVICO')).toBe('Serviço (Fator R)')
    expect(labelAnexoSimples('')).toBe('Serviço (Fator R)')
    expect(labelAnexoSimples('I')).toContain('Anexo I')
  })

  it('dataLocalIso usa componentes locais da data', () => {
    const data = new Date(2026, 5, 15, 23, 30)
    expect(dataLocalIso(data)).toBe('2026-06-15')
    expect(periodoUltimos12MesesLocal().data_fim).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
