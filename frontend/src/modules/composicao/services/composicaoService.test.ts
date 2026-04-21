import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
    post: postMock,
    delete: deleteMock,
  },
}))

import {
  adicionarInclusaoManual,
  aprovarSugestao,
  exportarComposicaoListaPdf,
  exportarComposicaoListaXlsx,
  gerarSugestoesComposicao,
  listarAlternativasSugestao,
  obterComposicaoPorProjeto,
  reavaliarPendenciasComposicao,
  reabrirComposicaoItem,
  removerInclusaoManual,
} from './composicaoService'

describe('composicaoService chamadas REST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({
      data: {},
      headers: {},
    })
    postMock.mockResolvedValue({ data: {} })
    deleteMock.mockResolvedValue({ data: {} })
  })

  it('GET snapshot do projeto', async () => {
    await obterComposicaoPorProjeto('pid')
    expect(getMock).toHaveBeenCalledWith('/composicao/projeto/pid/')
  })

  it('POST gerar sugestões com limpar_antes false', async () => {
    await gerarSugestoesComposicao('pid', false)
    expect(postMock).toHaveBeenCalledWith(
      '/composicao/projeto/pid/gerar-sugestoes/',
      { limpar_antes: false }
    )
  })

  it('POST reavaliar pendências', async () => {
    await reavaliarPendenciasComposicao('pid')
    expect(postMock).toHaveBeenCalledWith(
      '/composicao/projeto/pid/reavaliar-pendencias/',
      {}
    )
  })

  it('GET alternativas da sugestão', async () => {
    await listarAlternativasSugestao('sid')
    expect(getMock).toHaveBeenCalledWith('/composicao/sugestoes/sid/alternativas/')
  })

  it('POST aprovar sem produto substituto envia objeto vazio', async () => {
    await aprovarSugestao('sid', null)
    expect(postMock).toHaveBeenCalledWith('/composicao/sugestoes/sid/aprovar/', {})
  })

  it('POST aprovar com produto_id no corpo', async () => {
    await aprovarSugestao('sid', 'prod-99')
    expect(postMock).toHaveBeenCalledWith('/composicao/sugestoes/sid/aprovar/', {
      produto_id: 'prod-99',
    })
  })

  it('POST reabrir item', async () => {
    await reabrirComposicaoItem('item-x')
    expect(postMock).toHaveBeenCalledWith('/composicao/itens/item-x/reabrir/', {})
  })

  it('POST inclusão manual', async () => {
    await adicionarInclusaoManual('pid', {
      produto_id: 'p',
      quantidade: '2',
    })
    expect(postMock).toHaveBeenCalledWith(`/composicao/projeto/pid/inclusoes-manuais/`, {
      produto_id: 'p',
      quantidade: '2',
    })
  })

  it('DELETE inclusão manual', async () => {
    await removerInclusaoManual('inc-1')
    expect(deleteMock).toHaveBeenCalledWith(`/composicao/inclusoes-manuais/inc-1/`)
  })
})

describe('composicaoService downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMock.mockResolvedValue({
      data: new Blob(['x']),
      headers: {} as Record<string, string>,
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const anchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
      remove: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor as unknown as Node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exportarComposicaoListaXlsx chama GET blob no endpoint xlsx', async () => {
    await exportarComposicaoListaXlsx('proj-x', 'Nome')

    expect(getMock).toHaveBeenCalledWith(
      '/composicao/projeto/proj-x/export/xlsx/',
      expect.objectContaining({ responseType: 'blob' })
    )
  })

  it('exportarComposicaoListaPdf chama GET blob no endpoint pdf', async () => {
    await exportarComposicaoListaPdf('proj-y')

    expect(getMock).toHaveBeenCalledWith(
      '/composicao/projeto/proj-y/export/pdf/',
      expect.objectContaining({ responseType: 'blob' })
    )
  })
})
