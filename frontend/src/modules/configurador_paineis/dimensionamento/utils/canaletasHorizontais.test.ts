import { describe, expect, it } from 'vitest'
import { sugerirFaixasHorizontais } from './canaletasHorizontais'

describe('sugerirFaixasHorizontais', () => {
  it('sugere 3 faixas para placa 450 mm com canaleta 50 mm', () => {
    expect(sugerirFaixasHorizontais(450, 50, 160)).toBe(3)
  })

  it('mantém 2 faixas quando a faixa livre cabe no limite', () => {
    expect(sugerirFaixasHorizontais(200, 50, 160)).toBe(2)
  })
})
