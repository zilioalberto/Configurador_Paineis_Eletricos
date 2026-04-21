import { AxiosError } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from './ApiError'
import { extrairMensagemErroApi } from './extrairMensagemErroApi'

const parseBody = vi.hoisted(() => vi.fn())

vi.mock('./parseErrorResponseBody', () => ({
  parseErrorResponseBody: (data: unknown) => parseBody(data),
}))

describe('extrairMensagemErroApi', () => {
  it('prioriza mensagem de ApiError', () => {
    expect(extrairMensagemErroApi(new ApiError('Erro da API'))).toBe('Erro da API')
  })

  it('usa corpo da resposta em erro Axios', () => {
    parseBody.mockReturnValue('Detalhe do servidor')
    const err = new AxiosError<{ detail: string }>('fail', 'ERR')
    err.response = {
      status: 400,
      data: { detail: 'x' },
    } as typeof err.response

    expect(extrairMensagemErroApi(err)).toBe('Detalhe do servidor')
    expect(parseBody).toHaveBeenCalledWith({ detail: 'x' })
  })

  it('mensagem quando há pedido mas sem resposta', () => {
    const err = new AxiosError('timeout')
    err.request = {}
    expect(extrairMensagemErroApi(err)).toContain('conectar ao servidor')
  })

  it('mensagem genérica Error', () => {
    expect(extrairMensagemErroApi(new Error('falhou'))).toBe('falhou')
  })

  it('string vazia para valor desconhecido', () => {
    expect(extrairMensagemErroApi(null)).toBe('')
    expect(extrairMensagemErroApi({})).toBe('')
  })
})
