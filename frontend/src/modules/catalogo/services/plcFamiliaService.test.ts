import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...a: unknown[]) => getMock(...a),
  },
}))

import { listarPlcFamilias } from '@/modules/catalogo/services/plcFamiliaService'

describe('plcFamiliaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarPlcFamilias devolve data da API', async () => {
    getMock.mockResolvedValueOnce({ data: { familias: ['S7-1200', 'S7-1500'] } })
    await expect(listarPlcFamilias()).resolves.toEqual({
      familias: ['S7-1200', 'S7-1500'],
    })
    expect(getMock).toHaveBeenCalledWith('/catalogo/plc-familias/', undefined)
  })

  it('listarPlcFamilias com apenasEspecificacaoPlc envia query param', async () => {
    getMock.mockResolvedValueOnce({ data: { familias: ['X'] } })
    await listarPlcFamilias({ apenasEspecificacaoPlc: true })
    expect(getMock).toHaveBeenCalledWith('/catalogo/plc-familias/', {
      params: { apenas_especificacao_plc: '1' },
    })
  })
})
