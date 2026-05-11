import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}))

import { obterDashboardResumo } from './dashboardService'

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obtém resumo do dashboard', async () => {
    getMock.mockResolvedValueOnce({ data: { projetos: 2 } })

    await expect(obterDashboardResumo()).resolves.toEqual({ projetos: 2 })
    expect(getMock).toHaveBeenCalledWith('/dashboard/resumo/')
  })
})
