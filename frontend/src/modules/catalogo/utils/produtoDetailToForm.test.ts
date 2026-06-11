import { describe, expect, it, vi } from 'vitest'

import type { CategoriaProduto } from '../types/categoria'
import type { ProdutoDetail } from '../types/produto'
import { produtoDetailToForm } from './produtoDetailToForm'

vi.mock('./specFormHelpers', () => ({
  sanitizarEspecificacaoApi: vi.fn((x: Record<string, unknown>) => x),
  apiSpecParaFormState: vi.fn(() => ({ fromApi: true })),
}))

describe('produtoDetailToForm', () => {
  it('preenche campos básicos e aplica categoria', () => {
    const categorias: CategoriaProduto[] = [
      { id: 'c1', nome: 'GATEWAY', descricao: '', ativo: true },
    ]
    const p = {
      id: 'p1',
      codigo: 'G1',
      descricao: 'Gw',
      categoria: 'c1',
      categoria_nome: 'GATEWAY' as const,
      unidade_medida: 'UN',
      preco_base: '12',
      ativo: true,
    } satisfies ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.codigo).toBe('G1')
    expect(form.categoria).toBe('c1')
    expect(form.especificacao).toEqual({})
    expect(form.unidade_medida).toBe('UN')
    expect(form.fabricante_parceiro).toBe('')
    expect(form.fornecedor_parceiro).toBe('')
    expect(form.aliquota_ipi).toBe('')
  })

  it('usa parceiro fabricante como fornecedor padrão quando API antiga não traz fornecedor', () => {
    const categorias: CategoriaProduto[] = [
      { id: 'c1', nome: 'GATEWAY', descricao: '', ativo: true },
    ]
    const p = {
      id: 'p1',
      codigo: 'G1',
      descricao: 'Gw',
      categoria: 'c1',
      categoria_nome: 'GATEWAY' as const,
      fabricante_parceiro: 'fab-1',
      fabricante_parceiro_nome: 'Fabricante LTDA',
      fabricante_parceiro_documento: '123',
      unidade_medida: 'UN',
      preco_base: '12',
      ativo: true,
    } satisfies ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.fornecedor_parceiro).toBe('fab-1')
    expect(form.fornecedor_parceiro_nome).toBe('Fabricante LTDA')
    expect(form.fornecedor_parceiro_documento).toBe('123')
  })

  it('normaliza unidade de medida da API para o select do formulário', () => {
    const categorias: CategoriaProduto[] = [
      { id: 'c1', nome: 'GATEWAY', descricao: '', ativo: true },
    ]
    const p = {
      id: 'p1',
      codigo: 'G1',
      descricao: 'Gw',
      categoria: 'c1',
      categoria_nome: 'GATEWAY' as const,
      unidade_medida: 'kg',
      preco_base: '12',
      ativo: true,
    } satisfies ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.unidade_medida).toBe('KG')
  })

  it('injeta especificação quando API traz o bloco', () => {
    const categorias: CategoriaProduto[] = [
      { id: 'c1', nome: 'GATEWAY', descricao: '', ativo: true },
    ]
    const p = {
      id: 'p1',
      codigo: 'G1',
      descricao: 'Gw',
      categoria: 'c1',
      categoria_nome: 'GATEWAY' as const,
      unidade_medida: 'UN',
      preco_base: '12',
      ativo: true,
      especificacao_gateway: { ip: '192.0.2.1' }, // TEST-NET-1 (RFC 5737), só mock
    } as ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.especificacao).toEqual({ fromApi: true })
  })
})
