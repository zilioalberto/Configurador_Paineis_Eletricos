import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

import {
  enviarPdfAssinadoOfertaPublica,
  obterOfertaPublica,
  responderOfertaPublica,
} from './ofertaPublicaApi'

describe('ofertaPublicaApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('obterOfertaPublica retorna JSON quando ok', async () => {
    const payload = { codigo: 'P-1', preview: {}, valido_ate: '2026-12-31', resposta: {} }
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(payload),
    })

    await expect(obterOfertaPublica('tok-abc')).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/oferta-publica/tok-abc/'))
  })

  it('obterOfertaPublica lança erro com detail da API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Convite expirado' }),
    })

    await expect(obterOfertaPublica('x')).rejects.toThrow('Convite expirado')
  })

  it('responderOfertaPublica envia POST com payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ decisao: 'APROVADO', mensagem: 'OK' }),
    })

    const resp = await responderOfertaPublica('tok', {
      decisao: 'APROVADO',
      nome_responsavel: 'Maria',
    })

    expect(resp.decisao).toBe('APROVADO')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/oferta-publica/tok/responder/'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('enviarPdfAssinadoOfertaPublica envia FormData', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const arquivo = new File(['pdf'], 'assinado.pdf', { type: 'application/pdf' })

    await enviarPdfAssinadoOfertaPublica('tok', arquivo)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/oferta-publica/tok/pdf-assinado/'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
