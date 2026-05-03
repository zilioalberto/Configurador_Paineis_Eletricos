import { describe, expect, it, vi } from 'vitest'

import type { CategoriaProduto } from '../types/categoria'
import { produtoFormEmpty } from './produtoFormDefaults'
import { produtoFormToApiPayload } from './produtoPayload'

vi.mock('./specFormHelpers', () => ({
  especFormParaPayload: vi.fn(() => ({ ok: true })),
}))

describe('produtoFormToApiPayload', () => {
  it('monta base e inclui bloco de especificação quando categoria tem chave', () => {
    const data = produtoFormEmpty()
    data.categoria = 'cid-plc'
    data.codigo = ' P1 '
    data.valor_unitario = '10,5'
    data.especificacao = { campo: '1' }
    const categorias: CategoriaProduto[] = [
      { id: 'cid-plc', nome: 'PLC', descricao: '', ativo: true },
    ]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.codigo).toBe('P1')
    expect(payload.valor_unitario).toBe(10.5)
    expect(payload).toHaveProperty('especificacao_plc')
  })

  it('dimensões vazias viram null', () => {
    const data = produtoFormEmpty()
    data.categoria = 'x'
    data.largura_mm = '  '
    const categorias: CategoriaProduto[] = [{ id: 'x', nome: 'BOTAO', descricao: '', ativo: true }]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.largura_mm).toBeNull()
  })
})
