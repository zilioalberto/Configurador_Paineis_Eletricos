import { describe, expect, it } from 'vitest'

import {
  agruparBlocosEditorOferta,
  blocosOfertaParaPersistencia,
  estimarLinhasTextarea,
  mesclarBlocosTemplateEditor,
  normalizarBlocosOfertaTemplate,
  rotuloTipoBlocoOferta,
  secoesTemplateParaPerfil,
} from './ofertaBlocoUi'
import type { OrcamentoOfertaBlocoDto } from '../types/orcamentos'

describe('ofertaBlocoUi', () => {
  it('rotuloTipoBlocoOferta retorna label amigável', () => {
    expect(rotuloTipoBlocoOferta('ESCOPO')).toBe('Escopo de fornecimento')
  })

  it('estimarLinhasTextarea respeita mínimo e máximo', () => {
    expect(estimarLinhasTextarea('')).toBe(4)
    expect(estimarLinhasTextarea(Array.from({ length: 30 }, (_, i) => `l${i}`).join('\n'))).toBe(28)
  })

  it('normalizarBlocosOfertaTemplate completa seções do perfil', () => {
    const blocos: OrcamentoOfertaBlocoDto[] = [
      {
        id: '1',
        ordem: 0,
        tipo: 'ESCOPO',
        titulo: 'Escopo',
        conteudo: 'Texto escopo',
      },
      {
        id: '2',
        ordem: 1,
        tipo: 'INVESTIMENTO',
        titulo: 'Investimento',
        conteudo: 'ignorar',
      },
    ]
    const norm = normalizarBlocosOfertaTemplate(blocos, 'SOLUCAO_COMPLETA')
    expect(norm.map((b) => b.tipo)).toEqual([...secoesTemplateParaPerfil('SOLUCAO_COMPLETA')])
    expect(norm.find((b) => b.tipo === 'ESCOPO')?.conteudo).toBe('Texto escopo')
    expect(norm.some((b) => b.tipo === 'INVESTIMENTO')).toBe(false)
  })

  it('agruparBlocosEditorOferta respeita ordem customizada no corpo', () => {
    const blocos = mesclarBlocosTemplateEditor(
      [
        { id: '1', ordem: 1, tipo: 'INTRODUCAO', titulo: 'Apresentação', conteudo: 'A' },
        { id: '2', ordem: 2, tipo: 'SERVICOS', titulo: 'Serviços', conteudo: 'S' },
        { id: '3', ordem: 3, tipo: 'ITENS_FORNECIMENTO', titulo: 'Itens', conteudo: 'I' },
        { id: '4', ordem: 4, tipo: 'ESCOPO', titulo: 'Escopo', conteudo: 'E' },
      ] as OrcamentoOfertaBlocoDto[],
      'SOLUCAO_COMPLETA'
    )
    const grupos = agruparBlocosEditorOferta(blocos, 'SOLUCAO_COMPLETA')
    expect(grupos.corpo.map((b) => b.tipo)).toEqual([
      'SERVICOS',
      'ITENS_FORNECIMENTO',
      'ESCOPO',
    ])
  })

  it('agruparBlocosEditorOferta ordena corpo → exclusões → condições (padrão)', () => {
    const blocos = normalizarBlocosOfertaTemplate([], 'SOLUCAO_COMPLETA')
    const grupos = agruparBlocosEditorOferta(blocos, 'SOLUCAO_COMPLETA')
    expect(grupos.intro?.tipo).toBe('INTRODUCAO')
    expect(grupos.corpo.map((b) => b.tipo)).toEqual([
      'ESCOPO',
      'ITENS_FORNECIMENTO',
      'SERVICOS',
    ])
    expect(grupos.aposInvestimento.map((b) => b.tipo)).toEqual(['EXCLUSOES'])
    expect(grupos.condicoes.map((b) => b.tipo)).toEqual([
      'PRAZO_ENTREGA',
      'CONDICOES_PAGAMENTO',
      'CONDICOES_GERAIS',
      'GARANTIA',
      'OBSERVACOES',
    ])
  })

  it('blocosOfertaParaPersistencia ignora seções sem conteúdo', () => {
    const blocos = normalizarBlocosOfertaTemplate([], 'MATERIAIS')
    expect(blocosOfertaParaPersistencia(blocos, 'MATERIAIS')).toEqual([])
  })
})
