import { describe, expect, it } from 'vitest'

import {
  formatarConteudoListaOferta,
  formatarDescricaoItemOferta,
} from './ofertaFormatacao'

describe('ofertaFormatacao', () => {
  it('formata descrições de catálogo em caixa alta', () => {
    expect(formatarDescricaoItemOferta('CONTADOR AC3:9A 1NA 24VCC')).toBe(
      'Contador AC3:9A 1NA 24VCC'
    )
    expect(formatarDescricaoItemOferta('MÃO DE OBRA DE PROGRAMADOR')).toBe(
      'Mão de obra de programador'
    )
  })

  it('mantém texto já em capitalização mista', () => {
    expect(formatarDescricaoItemOferta('Contador AC3:9A 1NA 24VCC')).toBe(
      'Contador AC3:9A 1NA 24VCC'
    )
  })

  it('formata bloco de lista com marcadores', () => {
    const entrada = '- CONTADOR AC3:9A 1NA 24VCC;\n- MÃO DE OBRA DE PROGRAMADOR;'
    const saida = formatarConteudoListaOferta(entrada)
    expect(saida).toContain('Contador AC3:9A 1NA 24VCC')
    expect(saida).toContain('Mão de obra de programador')
    expect(saida).not.toMatch(/CONTADOR/)
  })
})
