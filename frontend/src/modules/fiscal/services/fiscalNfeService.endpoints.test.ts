import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import {
  atualizarControleNsu,
  importarCatalogoNfe,
  importarLoteDocumentosEmitidos,
  importarNfeXmlManual,
  importarNfesPorChaveSefaz,
  listarNfesRecebidas,
  listarSefazDistribuicao,
  obterControleNsu,
  obterNfeRecebida,
  previewCatalogoNfe,
  reclassificarEntradaNfe,
  sincronizarNfesSefaz,
  solicitarManifestacaoDestinatario,
  solicitarManifestacaoSefazDistribuicao,
  vincularProdutoItemNfe,
} from './fiscalNfeService'

describe('fiscalNfeService — endpoints adicionais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista distribuição SEFAZ limpando chave e CNPJ', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { count: 2, results: [{ id: 1 }, { id: 2 }], next: 'x', previous: null },
    })

    const page = await listarSefazDistribuicao(
      {
        chave_acesso: '1234 5678',
        cnpj_emitente: '12.345.678/0001-99',
        status: 'PENDENTE' as never,
        manifestacao_status: 'NAO_SOLICITADA' as never,
      },
      2,
      25,
    )

    expect(page.items).toHaveLength(2)
    expect(page.total).toBe(2)
    expect(page.hasNext).toBe(true)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/sefaz-distribuicao/', {
      params: {
        page: 2,
        page_size: 25,
        chave_acesso: '12345678',
        cnpj_emitente: '12345678000199',
        status: 'PENDENTE',
        manifestacao_status: 'NAO_SOLICITADA',
      },
    })
  })

  it('lista recebidas aplicando todos os filtros', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { count: 1, results: [{ id: 9 }], next: null, previous: 'p' },
    })

    const page = await listarNfesRecebidas({
      chave_acesso: ' 9999 ',
      cnpj_emitente: '11.222.333/0001-44',
      cnpj_destinatario: '55.666.777/0001-88',
      numero: '123',
      serie: '1',
      status_importacao: 'IMPORTADA' as never,
      origem_importacao: 'MANUAL' as never,
      objetivo_entrada: 'REVENDA' as never,
      manifestacao_status: 'CIENCIA' as never,
    })

    expect(page.hasPrevious).toBe(true)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfes/', {
      params: {
        page: 1,
        page_size: 50,
        chave_acesso: '9999',
        cnpj_emitente: '11222333000144',
        cnpj_destinatario: '55666777000188',
        numero: '123',
        serie: '1',
        status_importacao: 'IMPORTADA',
        origem_importacao: 'MANUAL',
        objetivo_entrada: 'REVENDA',
        manifestacao_status: 'CIENCIA',
      },
    })
  })

  it('retorna página vazia quando a resposta não é paginada', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })

    const page = await listarNfesRecebidas({}, 3, 10)

    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
    expect(page.page).toBe(3)
    expect(page.pageSize).toBe(10)
    expect(page.hasNext).toBe(false)
    expect(page.hasPrevious).toBe(false)
  })

  it('busca detalhe da NF-e recebida', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 7, chave_acesso: 'c' } })

    const detalhe = await obterNfeRecebida(7)

    expect(detalhe.id).toBe(7)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfes/7/')
  })

  it('reclassifica a entrada da NF-e', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 7 } })

    await reclassificarEntradaNfe(7, { objetivo_entrada: 'CONSUMO' as never })

    expect(apiClient.patch).toHaveBeenCalledWith('/fiscal/nfes/7/reclassificar/', {
      objetivo_entrada: 'CONSUMO',
    })
  })

  it('busca preview e importa catálogo da NF-e', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { itens: [] } })
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { produtos_criados: ['P1'], produtos_atualizados: [] },
    })

    await previewCatalogoNfe(5)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfes/5/preview-catalogo/')

    const res = await importarCatalogoNfe(5, { itens: [], criar_fornecedor: true })
    expect(res.produtos_criados).toEqual(['P1'])
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/5/importar-catalogo/', {
      itens: [],
      criar_fornecedor: true,
    })
  })

  it('vincula produto a item com registrar_depara padrão true', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { vinculado: true } })

    await vincularProdutoItemNfe(42, 'prod-1')

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/itens-nfe/42/vincular-produto/', {
      produto_id: 'prod-1',
      registrar_depara: true,
    })
  })

  it('importa XML manual normalizando CNPJ e NSU', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { created: true, message: 'ok', documento_id: 1 },
    })

    await importarNfeXmlManual({
      xml: '<nfe/>',
      cnpj_destinatario: '12.345.678/0001-99',
      nsu: 'NSU-000123',
      objetivo_entrada: 'REVENDA' as never,
    })

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/importar-manual/', {
      xml: '<nfe/>',
      cnpj_destinatario: '12345678000199',
      nsu: '000123',
      objetivo_entrada: 'REVENDA',
    })
  })

  it('importa XML manual apenas com xml quando campos vazios', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { created: false, message: 'dup', documento_id: 2 },
    })

    await importarNfeXmlManual({ xml: '<nfe/>', cnpj_destinatario: '', nsu: '' })

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/importar-manual/', {
      xml: '<nfe/>',
    })
  })

  it('importa lote de documentos emitidos', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { total: 2, criados: 2 } })

    await importarLoteDocumentosEmitidos(['<a/>', '<b/>'])

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes-emitidas/importar-lote/', {
      xmls: ['<a/>', '<b/>'],
      classificar_automaticamente: true,
    })
  })

  it('sincroniza NF-es com a SEFAZ', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { sucesso: true, mensagem: 'ok' } })

    const res = await sincronizarNfesSefaz()

    expect(res.sucesso).toBe(true)
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/sincronizar-sefaz/')
  })

  it('importa por chave filtrando chaves inválidas (≠44 dígitos)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { sucesso: true, total: 1 } })

    const chaveValida = '1'.repeat(44)
    await importarNfesPorChaveSefaz([chaveValida, '123', `${chaveValida.slice(0, 40)}aaaa`])

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/importar-por-chave/', {
      chaves: [chaveValida],
    })
  })

  it('solicita manifestação do destinatário', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'ok' } })

    await solicitarManifestacaoDestinatario(7, { tipo: 'CIENCIA', justificativa: '' })

    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfes/7/solicitar-manifestacao/', {
      tipo: 'CIENCIA',
      justificativa: '',
    })
  })

  it('solicita manifestação via distribuição SEFAZ', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'ok' } })

    await solicitarManifestacaoSefazDistribuicao(8, { tipo: 'CONFIRMACAO' })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/fiscal/sefaz-distribuicao/8/solicitar-manifestacao/',
      { tipo: 'CONFIRMACAO' },
    )
  })

  it('consulta e atualiza o controle de NSU', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { cnpj: '123', ultimo_nsu: '10' } })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { cnpj: '123', ultimo_nsu: '0' } })

    await obterControleNsu('12.345.678/0001-99')
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nsu/12345678000199/')

    await atualizarControleNsu('12.345.678/0001-99', '0')
    expect(apiClient.patch).toHaveBeenCalledWith('/fiscal/nsu/12345678000199/editar/', {
      ultimo_nsu: '0',
    })
  })
})
