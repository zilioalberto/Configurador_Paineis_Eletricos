import { describe, expect, it } from 'vitest'
import { calcularZonaUtilComponentes, validarZonaUtilComponentes } from './zonaUtilComponentes'

describe('zonaUtilComponentes', () => {
  it('detecta falta de altura quando faixas horizontais excedem a placa (largura base)', () => {
    const zona = calcularZonaUtilComponentes(355, 355, 2, 10, 50)
    const validacao = validarZonaUtilComponentes(zona, 20010, 80)

    expect(zona.altura_zona_componentes_mm).toBeLessThan(0)
    expect(validacao.ok).toBe(false)
    expect(validacao.alertas.some((a) => a.includes('horizontais'))).toBe(true)
  })

  it('aprova configuração com zona suficiente', () => {
    const zona = calcularZonaUtilComponentes(355, 355, 2, 3, 50)
    const validacao = validarZonaUtilComponentes(zona, 20010, 80)

    expect(zona.largura_zona_componentes_mm).toBeGreaterThan(0)
    expect(zona.altura_zona_componentes_mm).toBeGreaterThan(0)
    expect(validacao.ok).toBe(true)
  })
})
