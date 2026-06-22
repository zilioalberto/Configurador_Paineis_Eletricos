import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import apiClient from '@/services/apiClient'
import {
  atualizarContabilidadeReconciliacao,
  atualizarHoleriteCompetencia,
  conciliarHoleritesRhPacote,
  criarColaboradoresHoleritesPacote,
  criarPacoteObrigacao,
  marcarObrigacaoPaga,
  obterDashboardObrigacoes,
  obterPacoteObrigacao,
  listarPacotesObrigacoes,
  reconciliarPacote,
  uploadLotePacote,
} from './fiscalObrigacoesService'

describe('fiscalObrigacoesService endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obterDashboardObrigacoes faz GET no dashboard', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { total_pendente: '10.00' } })
    const dash = await obterDashboardObrigacoes()
    expect(dash.total_pendente).toBe('10.00')
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/obrigacoes/dashboard/')
  })

  it('listarPacotesObrigacoes retorna apenas results', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { results: [{ public_id: 'p-1' }] } })
    const pacotes = await listarPacotesObrigacoes()
    expect(pacotes).toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/obrigacoes/pacotes/')
  })

  it('obterPacoteObrigacao busca detalhe', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { public_id: 'p-1', cnpj: 'x' } })
    const pacote = await obterPacoteObrigacao('p-1')
    expect(pacote.public_id).toBe('p-1')
    expect(apiClient.get).toHaveBeenCalledWith('/fiscal/obrigacoes/pacotes/p-1/')
  })

  it('criarPacoteObrigacao envia competência e observações', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { public_id: 'p-2', competencia: '2026-03' } })
    await criarPacoteObrigacao('2026-03', 'obs')
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/obrigacoes/pacotes/criar/', {
      competencia: '2026-03',
      observacoes: 'obs',
    })
  })

  it('uploadLotePacote monta FormData multipart', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { importados: 2, pacote: {} } })
    const arquivos = [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')]
    const resp = await uploadLotePacote('p-1', arquivos)
    expect(resp.importados).toBe(2)
    const [url, form, config] = vi.mocked(apiClient.post).mock.calls[0]
    expect(url).toBe('/fiscal/obrigacoes/pacotes/p-1/upload-lote/')
    expect(form).toBeInstanceOf(FormData)
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })
  })

  it('reconciliarPacote dispara POST de reconciliação', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { pacote: { public_id: 'p-1' } } })
    await reconciliarPacote('p-1')
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/obrigacoes/pacotes/p-1/reconciliar/')
  })

  it('atualizarContabilidadeReconciliacao envia PATCH por tipo', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { pacote: {} } })
    await atualizarContabilidadeReconciliacao('p-1', 'FGTS', { valor_contabilidade: '500.00' })
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/fiscal/obrigacoes/pacotes/p-1/reconciliacoes/FGTS/contabilidade/',
      { valor_contabilidade: '500.00' },
    )
  })

  it('marcarObrigacaoPaga aceita payload opcional', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { public_id: 'o-1', status: 'PAGO' } })
    await marcarObrigacaoPaga('o-1', { data_pagamento: '2026-04-20' })
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/obrigacoes/itens/o-1/', {
      data_pagamento: '2026-04-20',
    })

    await marcarObrigacaoPaga('o-2')
    expect(apiClient.post).toHaveBeenCalledWith('/fiscal/obrigacoes/itens/o-2/', {})
  })

  it('atualizarHoleriteCompetencia envia PATCH no holerite', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 5, nome: 'X' } })
    await atualizarHoleriteCompetencia(5, { nome: 'X' })
    expect(apiClient.patch).toHaveBeenCalledWith('/fiscal/obrigacoes/holerites/5/', { nome: 'X' })
  })

  it('conciliarHoleritesRhPacote dispara POST', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { total: 1, pacote: {} } })
    await conciliarHoleritesRhPacote('p-1')
    expect(apiClient.post).toHaveBeenCalledWith(
      '/fiscal/obrigacoes/pacotes/p-1/holerites/conciliar-rh/',
    )
  })

  it('criarColaboradoresHoleritesPacote envia holerite_id quando informado', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { criados: 1, pacote: {} } })
    await criarColaboradoresHoleritesPacote('p-1', 9)
    expect(apiClient.post).toHaveBeenCalledWith(
      '/fiscal/obrigacoes/pacotes/p-1/holerites/criar-colaboradores/',
      { holerite_id: 9 },
    )

    await criarColaboradoresHoleritesPacote('p-1')
    expect(apiClient.post).toHaveBeenLastCalledWith(
      '/fiscal/obrigacoes/pacotes/p-1/holerites/criar-colaboradores/',
      {},
    )
  })
})
