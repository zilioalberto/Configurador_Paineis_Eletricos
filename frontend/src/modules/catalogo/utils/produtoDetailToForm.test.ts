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
      fabricante: 'F',
      unidade_medida: 'UN',
<<<<<<< HEAD
      preco_base: '12',
=======
      valor_unitario: '12',
>>>>>>> origin/main
      ativo: true,
    } satisfies ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.codigo).toBe('G1')
    expect(form.categoria).toBe('c1')
    expect(form.especificacao).toEqual({})
<<<<<<< HEAD
    expect(form.unidade_medida).toBe('UN')
    expect(form.fabricante_parceiro).toBe('')
    expect(form.aliquota_ipi).toBe('')
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
      fabricante: 'F',
      unidade_medida: 'kg',
      preco_base: '12',
      ativo: true,
    } satisfies ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.unidade_medida).toBe('KG')
=======
>>>>>>> origin/main
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
      fabricante: 'F',
      unidade_medida: 'UN',
<<<<<<< HEAD
      preco_base: '12',
=======
      valor_unitario: '12',
>>>>>>> origin/main
      ativo: true,
      especificacao_gateway: { ip: '192.0.2.1' }, // TEST-NET-1 (RFC 5737), só mock
    } as ProdutoDetail
    const form = produtoDetailToForm(p, categorias)
    expect(form.especificacao).toEqual({ fromApi: true })
  })
})
