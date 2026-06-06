import { describe, expect, it } from 'vitest'

import { calcularPrecoUnitarioLinha } from './orcamentoPrecoLinha'

describe('calcularPrecoUnitarioLinha', () => {
  it('soma custo, margem e IPI sobre o custo', () => {
    expect(calcularPrecoUnitarioLinha('95,33', '0', '3,25')).toBe('98.428225')
    expect(calcularPrecoUnitarioLinha('150', '10', '5.25')).toBe('172.875')
  })

  it('ignora IPI ausente', () => {
    expect(calcularPrecoUnitarioLinha('100', '10', null)).toBe('110')
  })
})
