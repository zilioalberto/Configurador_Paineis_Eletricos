import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}))

import {
  atualizarContatoParceiro,
  atualizarEnderecoParceiro,
  atualizarParceiro,
  atualizarParceiroPorCnpj,
  consultarCnpj,
  criarContatoParceiro,
  criarEnderecoParceiro,
  criarParceiro,
  excluirContatoParceiro,
  excluirEnderecoParceiro,
  excluirParceiro,
  listarContatosParceiro,
  listarEnderecosParceiro,
  listarParceiros,
  obterParceiro,
  salvarParceiroPorCnpj,
} from './cadastrosApi'

describe('cadastrosApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista parceiros com filtros e normaliza paginação', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        results: [{ id: 'p-1', razao_social: 'Cliente A', documento: '1' }],
      },
    })

    await expect(
      listarParceiros({ tipo: 'cliente', ativo: '1', search: 'Cliente' })
    ).resolves.toHaveLength(1)

    expect(getMock).toHaveBeenCalledWith('/cadastros/parceiros/', {
      params: { tipo: 'cliente', ativo: '1', search: 'Cliente', page_size: 500 },
    })
  })

  it('obtém, cria, atualiza e exclui parceiro', async () => {
    const payload = {
      tipo_pessoa: 'PJ' as const,
      documento: '123',
      razao_social: 'Cliente A',
      eh_cliente: true,
      eh_fornecedor: false,
      eh_parceiro: false,
      ativo: true,
    }

    getMock.mockResolvedValueOnce({ data: { id: 'p-1', ...payload } })
    postMock.mockResolvedValueOnce({ data: { id: 'p-2', ...payload } })
    patchMock.mockResolvedValueOnce({ data: { id: 'p-1', ...payload, ativo: false } })
    deleteMock.mockResolvedValueOnce({})

    await expect(obterParceiro('p-1')).resolves.toMatchObject({ id: 'p-1' })
    await expect(criarParceiro(payload)).resolves.toMatchObject({ id: 'p-2' })
    await expect(atualizarParceiro('p-1', { ativo: false })).resolves.toMatchObject({
      ativo: false,
    })
    await expect(excluirParceiro('p-1')).resolves.toBeUndefined()

    expect(getMock).toHaveBeenCalledWith('/cadastros/parceiros/p-1/')
    expect(postMock).toHaveBeenCalledWith('/cadastros/parceiros/', payload)
    expect(patchMock).toHaveBeenCalledWith('/cadastros/parceiros/p-1/', { ativo: false })
    expect(deleteMock).toHaveBeenCalledWith('/cadastros/parceiros/p-1/')
  })

  it('gerencia contatos do parceiro', async () => {
    const payload = { parceiro: 'p-1', nome: 'Compras', principal: true }

    getMock.mockResolvedValueOnce({ data: [{ id: 'c-1', ...payload }] })
    postMock.mockResolvedValueOnce({ data: { id: 'c-2', ...payload } })
    patchMock.mockResolvedValueOnce({ data: { id: 'c-1', ...payload, nome: 'Financeiro' } })
    deleteMock.mockResolvedValueOnce({})

    await expect(listarContatosParceiro('p-1')).resolves.toHaveLength(1)
    await expect(criarContatoParceiro(payload)).resolves.toMatchObject({ id: 'c-2' })
    await expect(atualizarContatoParceiro('c-1', { nome: 'Financeiro' })).resolves.toMatchObject({
      nome: 'Financeiro',
    })
    await expect(excluirContatoParceiro('c-1')).resolves.toBeUndefined()

    expect(getMock).toHaveBeenCalledWith('/cadastros/contatos/', {
      params: { parceiro: 'p-1', page_size: 500 },
    })
    expect(postMock).toHaveBeenCalledWith('/cadastros/contatos/', payload)
    expect(patchMock).toHaveBeenCalledWith('/cadastros/contatos/c-1/', {
      nome: 'Financeiro',
    })
    expect(deleteMock).toHaveBeenCalledWith('/cadastros/contatos/c-1/')
  })

  it('gerencia endereços do parceiro', async () => {
    const payload = { parceiro: 'p-1', municipio: 'Curitiba', uf: 'PR', principal: true }

    getMock.mockResolvedValueOnce({ data: [{ id: 'e-1', ...payload }] })
    postMock.mockResolvedValueOnce({ data: { id: 'e-2', ...payload } })
    patchMock.mockResolvedValueOnce({ data: { id: 'e-1', ...payload, uf: 'SC' } })
    deleteMock.mockResolvedValueOnce({})

    await expect(listarEnderecosParceiro('p-1')).resolves.toHaveLength(1)
    await expect(criarEnderecoParceiro(payload)).resolves.toMatchObject({ id: 'e-2' })
    await expect(atualizarEnderecoParceiro('e-1', { uf: 'SC' })).resolves.toMatchObject({
      uf: 'SC',
    })
    await expect(excluirEnderecoParceiro('e-1')).resolves.toBeUndefined()

    expect(getMock).toHaveBeenCalledWith('/cadastros/enderecos/', {
      params: { parceiro: 'p-1', page_size: 500 },
    })
    expect(postMock).toHaveBeenCalledWith('/cadastros/enderecos/', payload)
    expect(patchMock).toHaveBeenCalledWith('/cadastros/enderecos/e-1/', { uf: 'SC' })
    expect(deleteMock).toHaveBeenCalledWith('/cadastros/enderecos/e-1/')
  })

  it('lista parceiros como array direto e retorna vazio para payload inválido', async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: 'p-9', razao_social: 'X', documento: '1' }],
    })
    await expect(listarParceiros()).resolves.toHaveLength(1)

    getMock.mockResolvedValueOnce({ data: { foo: 1 } })
    await expect(listarParceiros()).resolves.toEqual([])
  })

  it('consulta e persiste parceiro por CNPJ (apenas dígitos na URL)', async () => {
    const consulta = { cnpj: '12345678000190', razao_social: 'Empresa' }
    const parceiro = { id: 'p-cnpj', razao_social: 'Empresa', documento: '12345678000190' }

    getMock.mockResolvedValueOnce({ data: consulta })
    postMock
      .mockResolvedValueOnce({ data: { parceiro, consulta, aviso: 'ok' } })
      .mockResolvedValueOnce({ data: { parceiro, consulta } })

    await expect(consultarCnpj('12.345.678/0001-90')).resolves.toEqual(consulta)
    await expect(
      salvarParceiroPorCnpj('12345678000190', {
        eh_cliente: true,
        eh_fornecedor: false,
        eh_parceiro: false,
      })
    ).resolves.toMatchObject({ aviso: 'ok' })
    await expect(
      atualizarParceiroPorCnpj('12345678000190', {
        parceiro_id: 'p-cnpj',
        eh_cliente: true,
        eh_fornecedor: false,
        eh_parceiro: false,
      })
    ).resolves.toMatchObject({ parceiro: { id: 'p-cnpj' } })

    expect(getMock).toHaveBeenCalledWith('/cadastros/cnpj/12345678000190/')
    expect(postMock).toHaveBeenNthCalledWith(1, '/cadastros/cnpj/12345678000190/salvar/', {
      eh_cliente: true,
      eh_fornecedor: false,
      eh_parceiro: false,
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/cadastros/cnpj/12345678000190/atualizar/', {
      parceiro_id: 'p-cnpj',
      eh_cliente: true,
      eh_fornecedor: false,
      eh_parceiro: false,
    })
  })
})
