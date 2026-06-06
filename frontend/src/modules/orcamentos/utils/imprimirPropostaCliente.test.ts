import { afterEach, describe, expect, it, vi } from 'vitest'

import { imprimirPropostaCliente } from './imprimirPropostaCliente'

describe('imprimirPropostaCliente', () => {
  afterEach(() => {
    document.body.classList.remove('proposta-cliente-impressao-ativa')
    vi.restoreAllMocks()
  })

  it('marca o body, define título do documento e chama window.print', () => {
    document.title = 'Título anterior'
    const root = document.createElement('div')
    root.className = 'proposta-cliente'
    root.setAttribute('data-nome-arquivo-impressao', 'Prop-06001-26 Rev. C')
    document.body.appendChild(root)

    const printMock = vi.spyOn(window, 'print').mockImplementation(() => {})
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (typeof cb === 'function') cb(0)
      return 0
    })

    imprimirPropostaCliente()

    expect(document.body).toHaveClass('proposta-cliente-impressao-ativa')
    expect(document.title).toBe('Prop-06001-26 Rev. C')
    expect(printMock).toHaveBeenCalled()

    root.remove()
  })
})
