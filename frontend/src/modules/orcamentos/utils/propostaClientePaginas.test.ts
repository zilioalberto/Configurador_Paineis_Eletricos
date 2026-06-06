import { describe, expect, it } from 'vitest'

import { agruparSecoesEmPaginas, totalPaginasProposta } from './propostaClientePaginas'

describe('propostaClientePaginas', () => {
  it('agrupa seções por peso estimado', () => {
    const secoes = [
      { tipo: 'ESCOPO', titulo: 'A', conteudo: 'x'.repeat(400) },
      { tipo: 'GARANTIA', titulo: 'B', conteudo: 'y'.repeat(400) },
    ]
    const grupos = agruparSecoesEmPaginas(secoes, 500)
    expect(grupos.length).toBeGreaterThanOrEqual(1)
    expect(grupos.flat()).toHaveLength(2)
  })

  it('calcula total de páginas com apêndice', () => {
    expect(totalPaginasProposta(2, false)).toBe(5)
    expect(totalPaginasProposta(2, true)).toBe(6)
  })
})
