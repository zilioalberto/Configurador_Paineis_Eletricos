import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
  },
}))

import {
  contagemNotificacoesNaoLidas,
  listarNotificacoesInternas,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from './notificacoesApi'

describe('notificacoesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarNotificacoesInternas', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'n1', titulo: 'Alerta' }] })
    const lista = await listarNotificacoesInternas()
    expect(lista).toHaveLength(1)
    expect(getMock).toHaveBeenCalledWith('/notificacoes/')
  })

  it('contagemNotificacoesNaoLidas retorna zero quando ausente', async () => {
    getMock.mockResolvedValueOnce({ data: {} })
    await expect(contagemNotificacoesNaoLidas()).resolves.toBe(0)
    expect(getMock).toHaveBeenCalledWith('/notificacoes/contagem/')
  })

  it('contagemNotificacoesNaoLidas retorna valor da API', async () => {
    getMock.mockResolvedValueOnce({ data: { nao_lidas: 3 } })
    await expect(contagemNotificacoesNaoLidas()).resolves.toBe(3)
  })

  it('marcarNotificacaoLida', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'n1', lida: true } })
    const item = await marcarNotificacaoLida('n1')
    expect(item.lida).toBe(true)
    expect(postMock).toHaveBeenCalledWith('/notificacoes/n1/marcar-lida/')
  })

  it('marcarTodasNotificacoesLidas', async () => {
    postMock.mockResolvedValueOnce({})
    await marcarTodasNotificacoesLidas()
    expect(postMock).toHaveBeenCalledWith('/notificacoes/marcar-todas-lidas/')
  })
})
