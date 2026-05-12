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
  obterDimensionamentoPorProjeto,
  patchCondutoresDimensionamento,
  recalcularDimensionamento,
} from './dimensionamentoService'

describe('dimensionamentoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obtem dimensionamento por projeto', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 'dim-1' } })

    await expect(obterDimensionamentoPorProjeto('proj-1')).resolves.toEqual({ id: 'dim-1' })

    expect(getMock).toHaveBeenCalledWith('/dimensionamento/projeto/proj-1/')
  })

  it('recalcula dimensionamento do projeto', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'dim-2' } })

    await expect(recalcularDimensionamento('proj-2')).resolves.toEqual({ id: 'dim-2' })

    expect(postMock).toHaveBeenCalledWith('/dimensionamento/projeto/proj-2/recalcular/')
  })

  it('atualiza escolhas de condutores', async () => {
    const payload = {
      circuitos: [{ id: 'c1', secao_condutor_fase_escolhida_mm2: '4' }],
      confirmar_revisao: false,
    }
    patchMock.mockResolvedValueOnce({ data: { id: 'dim-3' } })

    await expect(patchCondutoresDimensionamento('proj-3', payload)).resolves.toEqual({ id: 'dim-3' })

    expect(patchMock).toHaveBeenCalledWith('/dimensionamento/projeto/proj-3/condutores/', payload)
  })
})
