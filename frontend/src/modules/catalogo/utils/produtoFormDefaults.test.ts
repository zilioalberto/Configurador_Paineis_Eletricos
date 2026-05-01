import { describe, expect, it } from 'vitest'

import type { CategoriaProduto } from '../types/categoria'
import { applyCategoriaChange, produtoFormEmpty } from './produtoFormDefaults'

describe('produtoFormDefaults', () => {
  it('produtoFormEmpty define unidade e especificação nula', () => {
    const f = produtoFormEmpty()
    expect(f.unidade_medida).toBe('UN')
    expect(f.especificacao).toBeNull()
    expect(f.codigo).toBe('')
  })

  it('applyCategoriaChange com categoria com espec cria objeto vazio', () => {
    const prev = produtoFormEmpty()
    const categorias: CategoriaProduto[] = [
      { id: 'c1', nome: 'PAINEL', descricao: '', ativo: true },
    ]
    const next = applyCategoriaChange(prev, 'c1', categorias)
    expect(next.categoria).toBe('c1')
    expect(next.especificacao).toEqual({})
  })

  it('applyCategoriaChange sem match deixa especificação nula', () => {
    const prev = produtoFormEmpty()
    const next = applyCategoriaChange(prev, 'inexistente', [])
    expect(next.especificacao).toBeNull()
  })
})
