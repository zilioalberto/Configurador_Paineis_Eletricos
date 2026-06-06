import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToastMock = vi.hoisted(() => vi.fn())
const enviarOfertaClienteOrcamentoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../services/orcamentosApi', () => ({
  enviarOfertaClienteOrcamento: (...args: unknown[]) => enviarOfertaClienteOrcamentoMock(...args),
}))

import OrcamentoEnviarOfertaModal from './OrcamentoEnviarOfertaModal'

const orcamentoBase = {
  id: 'o-1',
  codigo: 'Prop-05001-26 Rev A',
  status: 'FINALIZADO',
  contato_cliente_nome: 'João',
  contato_cliente_email: 'joao@empresa.com',
} as const

describe('OrcamentoEnviarOfertaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enviarOfertaClienteOrcamentoMock.mockResolvedValue({
      ...orcamentoBase,
      status: 'ENVIADO',
      link_publico: 'https://app/oferta/tok',
    })
  })

  it('renderiza campos de e-mail e confirma envio', async () => {
    const onEnviado = vi.fn()
    render(
      <OrcamentoEnviarOfertaModal
        orcamento={orcamentoBase as never}
        onClose={vi.fn()}
        onEnviado={onEnviado}
      />
    )

    expect(screen.getByLabelText(/destinatário/i)).toHaveValue('João')
    fireEvent.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() => expect(enviarOfertaClienteOrcamentoMock).toHaveBeenCalled())
    expect(onEnviado).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ENVIADO' }),
      'https://app/oferta/tok'
    )
  })

  it('alerta e-mail inválido', async () => {
    render(
      <OrcamentoEnviarOfertaModal
        orcamento={orcamentoBase as never}
        onClose={vi.fn()}
        onEnviado={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText(/e-mails/i), { target: { value: 'invalido' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'warning' })
      )
    )
    expect(enviarOfertaClienteOrcamentoMock).not.toHaveBeenCalled()
  })
})
