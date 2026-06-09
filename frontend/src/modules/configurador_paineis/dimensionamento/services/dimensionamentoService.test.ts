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
  calcularDimensionamentoMecanico,
  obterDimensionamentoMecanico,
  obterDimensionamentoPorProjeto,
  patchCondutoresDimensionamento,
  recalcularDimensionamento,
  salvarEscolhasDimensionamentoMecanico,
} from './dimensionamentoService'

describe('dimensionamentoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obtem dimensionamento por projeto', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 'dim-1' } })

    await expect(obterDimensionamentoPorProjeto('proj-1')).resolves.toEqual({ id: 'dim-1' })

    expect(getMock).toHaveBeenCalledWith('/configurador/dimensionamento/projeto/proj-1/')
  })

  it('recalcula dimensionamento do projeto', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'dim-2' } })

    await expect(recalcularDimensionamento('proj-2')).resolves.toEqual({ id: 'dim-2' })

    expect(postMock).toHaveBeenCalledWith('/configurador/dimensionamento/projeto/proj-2/recalcular/')
  })

  it('atualiza escolhas de condutores', async () => {
    const payload = {
      circuitos: [{ id: 'c1', secao_condutor_fase_escolhida_mm2: '4' }],
      confirmar_revisao: false,
    }
    patchMock.mockResolvedValueOnce({ data: { id: 'dim-3' } })

    await expect(patchCondutoresDimensionamento('proj-3', payload)).resolves.toEqual({ id: 'dim-3' })

    expect(patchMock).toHaveBeenCalledWith('/configurador/dimensionamento/projeto/proj-3/condutores/', payload)
  })

  it('obtem dimensionamento mecânico por projeto', async () => {
    getMock.mockResolvedValueOnce({ data: { area_componentes_mm2: '1000' } })

    await expect(obterDimensionamentoMecanico('proj-m1')).resolves.toEqual({
      area_componentes_mm2: '1000',
    })

    expect(getMock).toHaveBeenCalledWith('/configurador/dimensionamento/projeto/proj-m1/mecanico/')
  })

  it('recalcula dimensionamento mecânico do projeto', async () => {
    postMock.mockResolvedValueOnce({ data: { canaletas_verticais: 2 } })

    await expect(calcularDimensionamentoMecanico('proj-m2')).resolves.toEqual({
      canaletas_verticais: 2,
    })

    expect(postMock).toHaveBeenCalledWith('/configurador/dimensionamento/projeto/proj-m2/mecanico/')
  })

  it('salva escolhas do dimensionamento mecânico', async () => {
    const payload = {
      painel_produto_id: 'painel-1',
      canaleta_produto_id: 'can-1',
      canaletas_verticais: 2,
      faixas_horizontais: 3,
      taxa_ocupacao_max_percentual: 75,
    }
    patchMock.mockResolvedValueOnce({ data: { canaletas_verticais: 2 } })

    await expect(salvarEscolhasDimensionamentoMecanico('proj-m3', payload)).resolves.toEqual({
      canaletas_verticais: 2,
    })

    expect(patchMock).toHaveBeenCalledWith(
      '/configurador/dimensionamento/projeto/proj-m3/mecanico/',
      payload
    )
  })
})
