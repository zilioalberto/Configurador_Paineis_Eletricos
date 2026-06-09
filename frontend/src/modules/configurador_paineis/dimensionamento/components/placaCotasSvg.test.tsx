import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CotaLinear,
  montarSegmentosAlturaPlaca,
  montarSegmentosLarguraPlaca,
} from './placaCotasSvg'

describe('placaCotasSvg', () => {
  it('segmenta largura com duas verticais e comprimento horizontal', () => {
    const segs = montarSegmentosLarguraPlaca(355, 30, 295, 2)
    expect(segs).toEqual([
      { inicio_mm: 0, fim_mm: 30, label: '30' },
      { inicio_mm: 30, fim_mm: 325, label: '295' },
      { inicio_mm: 325, fim_mm: 355, label: '30' },
    ])
  })

  it('segmenta altura com três faixas horizontais', () => {
    const segs = montarSegmentosAlturaPlaca(355, 30, 3, 265)
    expect(segs.some((s) => s.label === '30')).toBe(true)
    expect(segs[0].inicio_mm).toBe(0)
    expect(segs.at(-1)?.fim_mm).toBe(355)
  })

  it('cota largura total quando não há verticais', () => {
    const segs = montarSegmentosLarguraPlaca(400, 30, 400, 0)
    expect(segs).toEqual([{ inicio_mm: 0, fim_mm: 400, label: '400' }])
  })

  it('renderiza CotaLinear horizontal e vertical', () => {
    const { container: horizontal } = render(
      <CotaLinear
        x1={10}
        y1={20}
        x2={110}
        y2={20}
        refX1={10}
        refY1={5}
        refX2={110}
        refY2={5}
        label="100"
      />
    )
    expect(horizontal.querySelector('text')?.textContent).toBe('100')

    const { container: vertical } = render(
      <CotaLinear
        x1={30}
        y1={10}
        x2={30}
        y2={90}
        refX1={25}
        refY1={10}
        refX2={25}
        refY2={90}
        label="80"
      />
    )
    expect(vertical.querySelectorAll('polygon')).toHaveLength(2)
  })
})
