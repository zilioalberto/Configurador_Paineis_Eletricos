import axios from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/services/http/ApiError'
import { normalizeAxiosError } from '@/services/http/normalizeAxiosError'

describe('normalizeAxiosError', () => {
  it('reutiliza ApiError', () => {
    const err = new ApiError('x', { status: 400 })
    expect(normalizeAxiosError(err)).toBe(err)
  })

  it('envolve erro não-Axios', () => {
    const n = normalizeAxiosError(new TypeError('oops'))
    expect(n).toBeInstanceOf(ApiError)
    expect(n.message).toBe('Erro inesperado.')
  })

  it('timeout ECONNABORTED', () => {
    const ax = new axios.AxiosError('timeout')
    ax.code = 'ECONNABORTED'
    const n = normalizeAxiosError(ax)
    expect(n.message).toContain('tempo limite')
  })

  it('usa corpo parseado quando resposta HTTP', () => {
    const ax = new axios.AxiosError('fail')
    ax.response = {
      status: 422,
      statusText: '',
      data: { detail: 'Campo inválido' },
      headers: {},
      config: {} as never,
    }
    const n = normalizeAxiosError(ax)
    expect(n.status).toBe(422)
    expect(n.message).toBe('Campo inválido')
  })

  it('traduz mensagem conhecida em inglês do JWT (401)', () => {
    const ax = new axios.AxiosError('fail')
    ax.response = {
      status: 401,
      statusText: 'Unauthorized',
      data: { detail: 'No active account found with the given credentials' },
      headers: {},
      config: {} as never,
    }
    const n = normalizeAxiosError(ax)
    expect(n.message).toContain('E-mail ou senha incorretos')
  })

  it('requisição sem resposta (rede)', () => {
    const ax = new axios.AxiosError('net')
    ax.request = {}
    const n = normalizeAxiosError(ax)
    expect(n.message).toContain('conectar')
  })
})
