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
  atualizarMargemCliente,
  atualizarParametroConfiguracao,
  adicionarPainelConfigurador,
  criarMargemCliente,
  criarNovaRevisaoOrcamento,
  criarOrcamento,
  iniciarConfiguradorPainel,
  listarClientesOrcamento,
  listarContatosCliente,
  listarMargensClientes,
  listarOrcamentos,
  listarParametrosConfiguracao,
  obterErpModuleMeta,
  obterOrcamento,
  sincronizarComposicaoPainel,
  vincularProjetoConfiguradorPainel,
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

  it('obtem meta do modulo ERP', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        id: 'mod-orcamentos',
        area: 'erp',
        title: 'Orçamentos',
        summary: '',
        backend_package: 'erp',
        notes: '',
      },
    })

    await expect(obterErpModuleMeta('orcamentos')).resolves.toMatchObject({
      id: 'mod-orcamentos',
      title: 'Orçamentos',
    })

    expect(getMock).toHaveBeenCalledWith('/erp/modules/orcamentos/meta/')
  })

  it('lista orcamentos', async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: 'o-1', codigo: 'P-1', titulo: 'A', itens: [] }],
    })

    await expect(listarOrcamentos()).resolves.toHaveLength(1)
    expect(getMock).toHaveBeenCalledWith('/erp/orcamentos/')
  })

  it('lista margens de clientes como array ou como paginacao', async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          id: 'm-1',
          cliente: 'c-1',
          cliente_nome: 'Cliente',
          margem_produtos_percentual: '10',
          margem_servicos_percentual: '8',
        },
      ],
    })
    await expect(listarMargensClientes()).resolves.toHaveLength(1)

    getMock.mockResolvedValueOnce({
      data: {
        results: [
          {
            id: 'm-2',
            cliente: 'c-2',
            cliente_nome: 'Outro',
            margem_produtos_percentual: '5',
            margem_servicos_percentual: '4',
          },
        ],
      },
    })
    await expect(listarMargensClientes()).resolves.toEqual([
      {
        id: 'm-2',
        cliente: 'c-2',
        cliente_nome: 'Outro',
        margem_produtos_percentual: '5',
        margem_servicos_percentual: '4',
      },
    ])

    getMock.mockResolvedValueOnce({ data: { foo: 1 } })
    await expect(listarMargensClientes()).resolves.toEqual([])

    expect(getMock).toHaveBeenCalledWith('/erp/orcamentos/margens-clientes/')
  })

  it('lista parametros de configuracao', async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: 1, chave: 'x', valor: 'y', descricao: 'd', atualizado_em: '' }],
    })

    await expect(listarParametrosConfiguracao()).resolves.toMatchObject([{ chave: 'x' }])
    expect(getMock).toHaveBeenCalledWith('/erp/configuracoes/parametros/')
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

  it('cria e atualiza margem de cliente', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        id: 'm-1',
        cliente: 'c-1',
        cliente_nome: 'Cliente',
        margem_produtos_percentual: '12',
        margem_servicos_percentual: '8',
      },
    })
    patchMock.mockResolvedValueOnce({
      data: {
        id: 'm-1',
        cliente: 'c-1',
        cliente_nome: 'Cliente',
        margem_produtos_percentual: '15',
        margem_servicos_percentual: '10',
      },
    })

    await expect(
      criarMargemCliente({ cliente: 'c-1', margem_produtos_percentual: '12' })
    ).resolves.toMatchObject({ id: 'm-1' })
    await expect(
      atualizarMargemCliente('m-1', { margem_produtos_percentual: '15' })
    ).resolves.toMatchObject({ margem_produtos_percentual: '15' })

    expect(postMock).toHaveBeenCalledWith('/erp/orcamentos/margens-clientes/', {
      cliente: 'c-1',
      margem_produtos_percentual: '12',
    })
    expect(patchMock).toHaveBeenCalledWith('/erp/orcamentos/margens-clientes/m-1/', {
      margem_produtos_percentual: '15',
    })
  })

  it('cria nova revisão e gerencia painéis do configurador', async () => {
    postMock
      .mockResolvedValueOnce({
        data: { id: 'o-2', codigo: 'Prop-05001-26 Rev B', titulo: 'Rev', itens: [] },
      })
      .mockResolvedValueOnce({
        data: { id: 'vp-1', descricao_painel: 'Painel 01', ordem: 1, modo: 'ATIVO' },
      })
      .mockResolvedValueOnce({
        data: { id: 'vp-1', projeto_configurador_id: 'proj-1' },
      })
      .mockResolvedValueOnce({
        data: { id: 'vp-1', projeto_configurador_id: 'proj-1' },
      })
      .mockResolvedValueOnce({
        data: { itens_sincronizados: 3, orcamento: { id: 'o-1', codigo: 'X', titulo: 'T', itens: [] } },
      })

    await expect(
      criarNovaRevisaoOrcamento('o-1', {
        tipo_revisao: 'TECNICA',
        paineis_reconfigurar: ['vp-1'],
      })
    ).resolves.toMatchObject({ id: 'o-2' })

    await expect(adicionarPainelConfigurador('o-1', 'Painel 02')).resolves.toMatchObject({
      id: 'vp-1',
    })
    await expect(iniciarConfiguradorPainel('o-1', 'vp-1')).resolves.toMatchObject({
      projeto_configurador_id: 'proj-1',
    })
    await expect(
      vincularProjetoConfiguradorPainel('o-1', 'vp-1', 'proj-99')
    ).resolves.toMatchObject({ projeto_configurador_id: 'proj-1' })
    await expect(sincronizarComposicaoPainel('o-1', 'vp-1')).resolves.toMatchObject({
      itens_sincronizados: 3,
    })

    expect(postMock).toHaveBeenNthCalledWith(1, '/erp/orcamentos/o-1/nova-revisao/', {
      tipo_revisao: 'TECNICA',
      paineis_reconfigurar: ['vp-1'],
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/erp/orcamentos/o-1/configuradores-painel/', {
      descricao_painel: 'Painel 02',
    })
    expect(postMock).toHaveBeenNthCalledWith(
      3,
      '/erp/orcamentos/o-1/configuradores-painel/vp-1/iniciar-configurador/'
    )
    expect(postMock).toHaveBeenNthCalledWith(
      4,
      '/erp/orcamentos/o-1/configuradores-painel/vp-1/vincular-projeto/',
      { projeto_configurador_id: 'proj-99' }
    )
    expect(postMock).toHaveBeenNthCalledWith(
      5,
      '/erp/orcamentos/o-1/configuradores-painel/vp-1/sincronizar-composicao/'
    )
  })
})
