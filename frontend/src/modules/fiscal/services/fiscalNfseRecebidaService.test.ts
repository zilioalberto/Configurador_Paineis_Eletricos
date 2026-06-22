import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import {
  listarNfseRecebidas,
  obterControleNsuNfseAdn,
  obterNfseRecebida,
  sincronizarNfseAdn,
} from './fiscalNfseRecebidaService'

describe('fiscalNfseRecebidaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarNfseRecebidas normaliza items/total e envia page', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { results: [{ id: 1, numero: '10' }], count: 1 },
    })
    const page = await listarNfseRecebidas(2)
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(1)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfse-recebidas/', { params: { page: 2 } })
  })

  it('obterNfseRecebida busca detalhe por public_id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { public_id: 'p-1', numero: '55' } })
    const detalhe = await obterNfseRecebida('p-1')
    expect(detalhe.numero).toBe('55')
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nfse-recebidas/p-1/')
  })

  it('obterControleNsuNfseAdn limpa máscara do CNPJ', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { cnpj: '07284171000139' } })
    await obterControleNsuNfseAdn('07.284.171/0001-39')
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/nsu-nfse-adn/07284171000139/')
  })

  it('sincronizarNfseAdn dispara POST de sincronização', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { sucesso: true, documentos_novos: 3 } })
    const resp = await sincronizarNfseAdn()
    expect(resp.documentos_novos).toBe(3)
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/nfse-recebidas/sincronizar-adn/')
  })
})
