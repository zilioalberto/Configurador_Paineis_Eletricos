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
<<<<<<< HEAD
    data.preco_base = '10,5'
=======
    data.valor_unitario = '10,5'
>>>>>>> origin/main
    data.especificacao = { campo: '1' }
    const categorias: CategoriaProduto[] = [
      { id: 'cid-plc', nome: 'PLC', descricao: '', ativo: true },
    ]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.codigo).toBe('P1')
<<<<<<< HEAD
    expect(payload.preco_base).toBe(10.5)
=======
    expect(payload.valor_unitario).toBe(10.5)
>>>>>>> origin/main
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
<<<<<<< HEAD

  it('não envia itens fiscais (evita sobrescrever dados fiscais importados)', () => {
    const data = produtoFormEmpty()
    data.categoria = 'x'
    data.codigo = 'F1'
    const categorias: CategoriaProduto[] = [{ id: 'x', nome: 'BOTAO', descricao: '', ativo: true }]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload).not.toHaveProperty('itens_fiscais')
  })

  it('referência do fabricante vazia usa o código', () => {
    const data = produtoFormEmpty()
    data.categoria = 'x'
    data.codigo = 'ABC-1'
    data.referencia_fabricante = '  '
    const categorias: CategoriaProduto[] = [{ id: 'x', nome: 'BOTAO', descricao: '', ativo: true }]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.referencia_fabricante).toBe('ABC-1')
  })

  it('alíquota IPI vazia vira null', () => {
    const data = produtoFormEmpty()
    data.categoria = 'x'
    data.aliquota_ipi = ''
    const categorias: CategoriaProduto[] = [{ id: 'x', nome: 'BOTAO', descricao: '', ativo: true }]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.aliquota_ipi).toBeNull()
  })

  it('fabricante_parceiro vazio vira null', () => {
    const data = produtoFormEmpty()
    data.categoria = 'x'
    data.fabricante_parceiro = ''
    const categorias: CategoriaProduto[] = [{ id: 'x', nome: 'BOTAO', descricao: '', ativo: true }]
    const payload = produtoFormToApiPayload(data, categorias)
    expect(payload.fabricante_parceiro).toBeNull()
  })
=======
>>>>>>> origin/main
})
