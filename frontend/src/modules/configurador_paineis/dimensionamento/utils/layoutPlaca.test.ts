import { describe, expect, it } from 'vitest'
import {
  atualizarCanaletaIntermediariaY,
  gerarLayoutPlaca,
  rotuloCanaleta,
  tituloCanaleta,
} from './layoutPlaca'

describe('layoutPlaca', () => {
  it('gera dois trilhos DIN entre três canaletas horizontais', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)

    expect(layout.canaletas_horizontais).toHaveLength(3)
    expect(layout.trilhos_din).toHaveLength(2)
    expect(layout.trilhos_din[0].comprimento_mm).toBe(295)
    expect(layout.trilhos_din[0].largura_mm).toBe(295)
  })

  it('canaletas horizontais extremas percorrem largura total da placa', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)
    const sup = layout.canaletas_horizontais.find((c) => c.fixa_extremidade === 'superior')
    const inf = layout.canaletas_horizontais.find((c) => c.fixa_extremidade === 'inferior')
    expect(sup?.largura_mm).toBe(355)
    expect(inf?.largura_mm).toBe(355)
    expect(sup?.x_mm).toBe(0)
  })

  it('canaletas verticais ficam entre as horizontais extremas', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)
    expect(layout.canaletas_verticais[0].y_mm).toBe(30)
    expect(layout.canaletas_verticais[0].altura_mm).toBe(295)
    expect(layout.comprimento_canaleta_vertical_mm).toBe(295)
  })

  it('não gera trilho com apenas uma canaleta horizontal', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 1, 30)
    expect(layout.trilhos_din).toHaveLength(0)
  })

  it('rotuloCanaleta inclui base, altura do perfil e comprimento', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30, undefined, 50)
    const vertical = layout.canaletas_verticais[0]
    expect(rotuloCanaleta(vertical, layout)).toBe('30 base · 50 alt · 295 comp')
    expect(tituloCanaleta(vertical, layout)).toBe(
      '30 mm (base) × 50 mm altura × 295 mm comprimento'
    )
  })

  it('impede canaleta intermediaria de sobrepor componente', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)
    const canaleta = layout.canaletas_horizontais.find((c) => c.arrastavel)
    expect(canaleta).toBeDefined()

    const layoutAjustado = atualizarCanaletaIntermediariaY(
      layout,
      canaleta!.indice_faixa!,
      200,
      [
        {
          x_mm: 80,
          y_mm: 210,
          largura_mm: 80,
          altura_mm: 40,
        },
      ]
    )
    const canaletaAjustada = layoutAjustado.canaletas_horizontais.find(
      (c) => c.indice_faixa === canaleta!.indice_faixa
    )

    expect(canaletaAjustada?.y_mm).toBe(180)
  })
})
