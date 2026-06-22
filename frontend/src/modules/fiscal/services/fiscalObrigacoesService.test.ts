import { beforeEach, describe, expect, it, vi } from 'vitest'

const patchMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    delete: deleteMock,
    patch: patchMock,
  },
}))

import { atualizarObrigacaoFiscal, excluirAnexoObrigacaoFiscal, excluirTodosAnexosPacote } from './fiscalObrigacoesService'

describe('fiscalObrigacoesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('atualizarObrigacaoFiscal envia PATCH com payload', async () => {
    patchMock.mockResolvedValueOnce({
      data: { public_id: 'obr-1', valor: '1523.45' },
    })

    await expect(
      atualizarObrigacaoFiscal('obr-1', {
        valor: '1523.45',
        data_vencimento: '2026-04-20',
        observacoes: 'manual',
      }),
    ).resolves.toMatchObject({ public_id: 'obr-1', valor: '1523.45' })

    expect(patchMock).toHaveBeenCalledWith('/fiscal/obrigacoes/itens/obr-1/', {
      valor: '1523.45',
      data_vencimento: '2026-04-20',
      observacoes: 'manual',
    })
  })

  it('excluirAnexoObrigacaoFiscal envia DELETE para o anexo', async () => {
    deleteMock.mockResolvedValueOnce({ data: undefined })

    await expect(excluirAnexoObrigacaoFiscal('anexo-1')).resolves.toBeUndefined()

    expect(deleteMock).toHaveBeenCalledWith('/fiscal/obrigacoes/anexos/anexo-1/')
  })

  it('excluirTodosAnexosPacote envia DELETE para o pacote', async () => {
    deleteMock.mockResolvedValueOnce({
      data: { excluidos: 3, pacote: { public_id: 'pac-1', anexos: [] } },
    })

    await expect(excluirTodosAnexosPacote('pac-1')).resolves.toMatchObject({
      excluidos: 3,
    })

    expect(deleteMock).toHaveBeenCalledWith('/fiscal/obrigacoes/pacotes/pac-1/anexos/')
  })
})
