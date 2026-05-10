import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
  },
}))

import {
  atualizarOrcamento,
  atualizarParametroConfiguracao,
  criarOrcamento,
  listarClientesOrcamento,
  listarContatosCliente,
  obterOrcamento,
} from './erpApi'

describe('erpApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obtem orcamento por id', async () => {
    getMock.mockResolvedValueOnce({
      data: { id: 'o-1', codigo: 'P-1', titulo: 'Teste', itens: [] },
    })

    await expect(obterOrcamento('o-1')).resolves.toEqual({
      id: 'o-1',
      codigo: 'P-1',
      titulo: 'Teste',
      itens: [],
    })

    expect(getMock).toHaveBeenCalledWith('/erp/orcamentos/o-1/')
  })

  it('cria orçamento sem enviar código manual', async () => {
    postMock.mockResolvedValueOnce({
      data: { id: 'o-1', codigo: 'Prop-05001-26', titulo: 'Nova proposta' },
    })

    await expect(
      criarOrcamento({
        titulo: 'Nova proposta',
        cliente: 'cliente-1',
        contato_cliente: 'contato-1',
      })
    ).resolves.toMatchObject({ codigo: 'Prop-05001-26' })

    expect(postMock).toHaveBeenCalledWith('/erp/orcamentos/', {
      titulo: 'Nova proposta',
      cliente: 'cliente-1',
      contato_cliente: 'contato-1',
    })
  })

  it('atualiza orcamento em PATCH parcial', async () => {
    patchMock.mockResolvedValueOnce({
      data: { id: 'o-1', titulo: 'Novo', status: 'ENVIADO' },
    })

    await expect(
      atualizarOrcamento('o-1', { titulo: 'Novo', status: 'ENVIADO' })
    ).resolves.toEqual({ id: 'o-1', titulo: 'Novo', status: 'ENVIADO' })

    expect(patchMock).toHaveBeenCalledWith('/erp/orcamentos/o-1/', {
      titulo: 'Novo',
      status: 'ENVIADO',
    })
  })

  it('atualiza orcamento com itens em PATCH', async () => {
    patchMock.mockResolvedValueOnce({
      data: {
        id: 'o-1',
        codigo: 'X',
        titulo: 'T',
        itens: [{ id: 'i-1', ordem: 0, descricao: 'A', quantidade: '1', preco_unitario: '2' }],
      },
    })

    await expect(
      atualizarOrcamento('o-1', {
        itens: [{ id: 'i-1', ordem: 0, descricao: 'A', quantidade: '1', preco_unitario: '2' }],
      })
    ).resolves.toMatchObject({ id: 'o-1' })

    expect(patchMock).toHaveBeenCalledWith('/erp/orcamentos/o-1/', {
      itens: [{ id: 'i-1', ordem: 0, descricao: 'A', quantidade: '1', preco_unitario: '2' }],
    })
  })

  it('atualiza parametro com chave codificada na URL', async () => {
    patchMock.mockResolvedValueOnce({
      data: { id: 1, chave: 'a/b', valor: 'x', descricao: 'd', atualizado_em: '' },
    })

    await expect(
      atualizarParametroConfiguracao('a/b', { valor: 'x', descricao: 'd' })
    ).resolves.toMatchObject({ chave: 'a/b', valor: 'x' })

    expect(patchMock).toHaveBeenCalledWith('/erp/configuracoes/parametros/a%2Fb/', {
      valor: 'x',
      descricao: 'd',
    })
  })

  it('lista clientes e contatos de cliente', async () => {
    getMock
      .mockResolvedValueOnce({ data: [{ id: 'c-1', razao_social: 'Cliente', documento: '1' }] })
      .mockResolvedValueOnce({ data: [{ id: 'ct-1', parceiro: 'c-1', nome: 'Contato' }] })

    await expect(listarClientesOrcamento()).resolves.toHaveLength(1)
    await expect(listarContatosCliente('c-1')).resolves.toHaveLength(1)

    expect(getMock).toHaveBeenNthCalledWith(1, '/cadastros/parceiros/', {
      params: { tipo: 'cliente', ativo: '1', page_size: 500 },
    })
    expect(getMock).toHaveBeenNthCalledWith(2, '/cadastros/contatos/', {
      params: { parceiro: 'c-1', page_size: 500 },
    })
  })
})
