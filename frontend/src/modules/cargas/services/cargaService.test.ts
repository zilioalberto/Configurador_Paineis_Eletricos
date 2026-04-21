import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()
const putMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    put: (...a: unknown[]) => putMock(...a),
    delete: (...a: unknown[]) => deleteMock(...a),
  },
}))

import {
  atualizarCarga,
  atualizarModeloCarga,
  criarCarga,
  criarModeloCarga,
  deletarCarga,
  deletarModeloCarga,
  listarCargas,
  listarModelosCarga,
  obterCarga,
} from '@/modules/cargas/services/cargaService'

describe('cargaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarCargas aceita array direto ou results', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'c1' }] })
    expect(await listarCargas('p')).toEqual([{ id: 'c1' }])

    getMock.mockResolvedValueOnce({ data: { results: [{ id: 'c2' }] } })
    expect(await listarCargas('p')).toEqual([{ id: 'c2' }])

    getMock.mockResolvedValueOnce({ data: {} })
    expect(await listarCargas('p')).toEqual([])
  })

  it('listarModelosCarga envia params e devolve dados', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 'm1' }] })
    await expect(listarModelosCarga({ tipo: 'MOTOR', q: 'bomba' })).resolves.toEqual([
      { id: 'm1' },
    ])
    expect(getMock).toHaveBeenCalledWith('/cargas/modelos/', {
      params: { tipo: 'MOTOR', q: 'bomba' },
    })
  })

  it('obterCarga', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 'x' } })
    await expect(obterCarga('x')).resolves.toEqual({ id: 'x' })
    expect(getMock).toHaveBeenCalledWith('/cargas/x/')
  })

  it('criarCarga e atualizarCarga', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'n' } })
    await expect(criarCarga({ projeto: 'p' })).resolves.toEqual({ id: 'n' })

    putMock.mockResolvedValueOnce({ data: { id: 'x' } })
    await expect(atualizarCarga('x', { tag: 'T' })).resolves.toEqual({ id: 'x' })
  })

  it('deletarCarga', async () => {
    deleteMock.mockResolvedValueOnce({})
    await deletarCarga('y')
    expect(deleteMock).toHaveBeenCalledWith('/cargas/y/')
  })

  it('criarModeloCarga', async () => {
    postMock.mockResolvedValueOnce({
      data: { id: 'mid', nome: 'N', tipo: 'VALVULA', payload: {}, ativo: true },
    })
    const body = {
      nome: 'N',
      tipo: 'VALVULA' as const,
      payload: { quantidade: 1 },
      ativo: false,
    }
    await expect(criarModeloCarga(body)).resolves.toMatchObject({ nome: 'N' })
    expect(postMock).toHaveBeenCalledWith('/cargas/modelos/', body)
  })

  it('atualizarModeloCarga e deletarModeloCarga', async () => {
    putMock.mockResolvedValueOnce({ data: { id: 'mid' } })
    await atualizarModeloCarga('mid', {
      nome: 'Alt',
      tipo: 'OUTRO',
      payload: {},
    })
    expect(putMock).toHaveBeenCalled()

    deleteMock.mockResolvedValueOnce({})
    await deletarModeloCarga('mid')
    expect(deleteMock).toHaveBeenCalledWith('/cargas/modelos/mid/')
  })
})
