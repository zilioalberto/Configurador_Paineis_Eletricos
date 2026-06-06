import { describe, expect, it } from 'vitest'

import {
  formatarNomeEmpresaExibicao,
  linhasDescricaoItem,
  nomeArquivoImpressaoPropostaCliente,
  numeroPropostaExibicao,
  rotuloRevisao,
  secoesAposInvestimento,
  secoesCondicoesComerciais,
  secoesCorpoProposta,
  tituloSecaoFigma,
} from './propostaClienteUi'

describe('propostaClienteUi', () => {
  it('separa condições comerciais do corpo', () => {
    const secoes = [
      { tipo: 'ESCOPO', titulo: 'Escopo', conteudo: 'A' },
      { tipo: 'PRAZO_ENTREGA', titulo: 'Prazo', conteudo: '30 dias' },
    ]
    expect(secoesCorpoProposta(secoes)).toHaveLength(1)
    expect(secoesCondicoesComerciais(secoes)).toHaveLength(1)
  })

  it('preserva ordem customizada no corpo da proposta', () => {
    const secoes = [
      { tipo: 'SERVICOS', titulo: 'Serviços', conteudo: 'S' },
      { tipo: 'ITENS_FORNECIMENTO', titulo: 'Itens', conteudo: 'I' },
      { tipo: 'ESCOPO', titulo: 'Escopo', conteudo: 'E' },
    ]
    expect(secoesCorpoProposta(secoes).map((s) => s.tipo)).toEqual([
      'SERVICOS',
      'ITENS_FORNECIMENTO',
      'ESCOPO',
    ])
  })

  it('coloca exclusões após investimento, fora do corpo anterior', () => {
    const secoes = [
      { tipo: 'ESCOPO', titulo: 'Escopo', conteudo: 'A' },
      { tipo: 'EXCLUSOES', titulo: 'Exclusões', conteudo: 'Não inclui frete.' },
    ]
    expect(secoesCorpoProposta(secoes).map((s) => s.tipo)).toEqual(['ESCOPO'])
    expect(secoesAposInvestimento(secoes).map((s) => s.tipo)).toEqual(['EXCLUSOES'])
  })

  it('formata revisão e título Figma', () => {
    expect(rotuloRevisao('B')).toBe('Rev. B')
    expect(rotuloRevisao('')).toBe('Rev. A')
    expect(tituloSecaoFigma('Escopo de fornecimento')).toBe('ESCOPO DE FORNECIMENTO')
  })

  it('divide descrição de item em título e detalhe', () => {
    expect(linhasDescricaoItem('Título\nDetalhe longo')).toEqual({
      titulo: 'Título',
      detalhe: 'Detalhe longo',
    })
    expect(linhasDescricaoItem('Só título')).toEqual({ titulo: 'Só título', detalhe: '' })
  })

  it('formata razão social com iniciais maiúsculas', () => {
    expect(
      formatarNomeEmpresaExibicao(
        'AHT COOLING SYSTEMS, INDUSTRIA, COMERCIO E SERVICOS DE EQUIPAMENTOS DE REFRIGERACAO LTDA'
      )
    ).toBe(
      'Aht Cooling Systems, Industria, Comercio e Servicos de Equipamentos de Refrigeracao LTDA'
    )
  })

  it('extrai número da proposta sem revisão', () => {
    expect(numeroPropostaExibicao('Prop-06001-26 Rev C', 'C')).toBe('Prop-06001-26')
    expect(numeroPropostaExibicao('Prop-06001-26 Rev C', 'C', 'Prop-06001-26')).toBe('Prop-06001-26')
    expect(numeroPropostaExibicao('Prop-06001-26', 'C')).toBe('Prop-06001-26')
  })

  it('monta nome de arquivo para impressão com número e revisão', () => {
    expect(
      nomeArquivoImpressaoPropostaCliente('Prop-06001-26 Rev C', 'C', 'Prop-06001-26')
    ).toBe('Prop-06001-26 Rev. C')
    expect(nomeArquivoImpressaoPropostaCliente('Prop-001', 'A')).toBe('Prop-001 Rev. A')
  })
})
