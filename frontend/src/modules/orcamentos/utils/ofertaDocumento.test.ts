import { describe, expect, it } from 'vitest'

import {
  blocosParaDocumento,
  documentoParaBlocos,
  extrairSecoesDocumento,
  tipoBlocoPorTituloSecao,
} from './ofertaDocumento'
import type { OrcamentoOfertaBlocoDto } from '../types/orcamentos'

describe('ofertaDocumento', () => {
  it('tipoBlocoPorTituloSecao reconhece título e código', () => {
    expect(tipoBlocoPorTituloSecao('Escopo de fornecimento')).toBe('ESCOPO')
    expect(tipoBlocoPorTituloSecao('ESCOPO')).toBe('ESCOPO')
    expect(tipoBlocoPorTituloSecao('Seção customizada')).toBeNull()
  })

  it('extrairSecoesDocumento aceita ## e numeração', () => {
    const texto = [
      'Texto inicial.',
      '',
      '## Apresentação',
      'Olá cliente.',
      '',
      '1. Escopo de fornecimento',
      '- Item A',
    ].join('\n')
    const secoes = extrairSecoesDocumento(texto)
    expect(secoes).toHaveLength(2)
    expect(secoes[0].titulo).toBe('Apresentação')
    expect(secoes[0].conteudo).toContain('Texto inicial.')
    expect(secoes[1].titulo).toBe('Escopo de fornecimento')
    expect(secoes[1].conteudo).toContain('- Item A')
  })

  it('blocosParaDocumento e documentoParaBlocos são inversos', () => {
    const blocos: OrcamentoOfertaBlocoDto[] = [
      {
        id: 'a',
        ordem: 0,
        tipo: 'ESCOPO',
        titulo: 'Escopo de fornecimento',
        conteudo: 'Fornecimento completo.',
      },
      {
        id: 'b',
        ordem: 1,
        tipo: 'GARANTIA',
        titulo: 'Garantia',
        conteudo: '12 meses.',
      },
    ]
    const doc = blocosParaDocumento(blocos)
    expect(doc).toContain('## Escopo de fornecimento')
    const parsed = documentoParaBlocos(doc, blocos)
    expect(parsed.find((b) => b.tipo === 'ESCOPO')?.conteudo).toBe('Fornecimento completo.')
    expect(parsed.find((b) => b.tipo === 'GARANTIA')?.id).toBe('b')
  })

  it('seções desconhecidas vão para OBSERVACOES', () => {
    const parsed = documentoParaBlocos('## Anexo técnico\n\nDetalhes do projeto.')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].tipo).toBe('OBSERVACOES')
    expect(parsed[0].conteudo).toContain('Anexo técnico')
  })

  it('com perfil mantém todas as seções do template e limpa as removidas do texto', () => {
    const blocos: OrcamentoOfertaBlocoDto[] = [
      {
        id: 'a',
        ordem: 0,
        tipo: 'INTRODUCAO',
        titulo: 'Apresentação',
        conteudo: 'Texto intro.',
      },
      {
        id: 'b',
        ordem: 1,
        tipo: 'ESCOPO',
        titulo: 'Escopo de fornecimento',
        conteudo: 'Escopo antigo.',
      },
    ]
    const parsed = documentoParaBlocos('## Apresentação\n\nTexto intro.', blocos, 'SOLUCAO_COMPLETA')
    const escopo = parsed.find((b) => b.tipo === 'ESCOPO')
    const intro = parsed.find((b) => b.tipo === 'INTRODUCAO')
    expect(intro?.conteudo).toBe('Texto intro.')
    expect(escopo?.conteudo).toBe('')
    expect(parsed.length).toBeGreaterThan(2)
  })
})
