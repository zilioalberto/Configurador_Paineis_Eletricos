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
  alocarCodigoProjeto,
  atualizarProjeto,
  criarProjeto,
  deletarProjeto,
  listarProjetos,
  obterProjeto,
} from '@/modules/projetos/services/projetoService'
import type { ProjetoFormData } from '@/modules/projetos/types/projeto'

describe('projetoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarProjetos aceita array direto', async () => {
    getMock.mockResolvedValue({ data: [{ id: '1' }] })
    const r = await listarProjetos()
    expect(r).toEqual([{ id: '1' }])
  })

  it('listarProjetos aceita envelope results', async () => {
    getMock.mockResolvedValue({ data: { results: [{ id: '2' }] } })
    const r = await listarProjetos()
    expect(r).toEqual([{ id: '2' }])
  })

  it('listarProjetos devolve lista vazia sem dados reconhecíveis', async () => {
    getMock.mockResolvedValue({ data: {} })
    expect(await listarProjetos()).toEqual([])
  })

  it('obterProjeto', async () => {
    getMock.mockResolvedValue({ data: { id: '1', nome: 'N' } })
    expect(await obterProjeto('1')).toEqual({ id: '1', nome: 'N' })
  })

  it('alocarCodigoProjeto', async () => {
    postMock.mockResolvedValue({ data: { codigo: '04001-26' } })
    expect(await alocarCodigoProjeto()).toEqual({ codigo: '04001-26' })
  })

  it('criarProjeto', async () => {
    const payload = { nome: 'P' } as unknown as ProjetoFormData
    postMock.mockResolvedValue({ data: { id: 'x', nome: 'P' } })
    expect(await criarProjeto(payload)).toEqual({ id: 'x', nome: 'P' })
  })

  it('atualizarProjeto', async () => {
    const payload = { nome: 'Q' } as unknown as ProjetoFormData
    putMock.mockResolvedValue({ data: { id: 'x', nome: 'Q' } })
    expect(await atualizarProjeto('x', payload)).toEqual({ id: 'x', nome: 'Q' })
  })

  it('deletarProjeto', async () => {
    deleteMock.mockResolvedValue({})
    await deletarProjeto('x')
    expect(deleteMock).toHaveBeenCalled()
  })
})
