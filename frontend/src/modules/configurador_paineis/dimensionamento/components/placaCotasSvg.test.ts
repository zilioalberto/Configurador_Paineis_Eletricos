import { describe, expect, it } from 'vitest'
import {
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
})
