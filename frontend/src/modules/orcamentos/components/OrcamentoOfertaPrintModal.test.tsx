import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const obterPreviewOfertaOrcamentoMock = vi.hoisted(() => vi.fn())
const getMock = vi.hoisted(() => vi.fn())
const imprimirMock = vi.hoisted(() => vi.fn())

vi.mock('../services/orcamentosApi', () => ({
  obterPreviewOfertaOrcamento: (...args: unknown[]) => obterPreviewOfertaOrcamentoMock(...args),
}))

vi.mock('@/services/apiClient', () => ({
  default: { get: getMock },
}))

vi.mock('../utils/imprimirPropostaCliente', () => ({
  imprimirPropostaCliente: imprimirMock,
}))

vi.mock('./PropostaClienteDocument', () => ({
  default: ({ preview }: { preview: { titulo?: string } }) => (
    <div data-testid="preview-doc">{preview.titulo}</div>
  ),
}))

import OrcamentoOfertaPrintModal from './OrcamentoOfertaPrintModal'

describe('OrcamentoOfertaPrintModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterPreviewOfertaOrcamentoMock.mockResolvedValue({
      titulo: 'Proposta teste',
      secoes: [{ tipo: 'ESCOPO', titulo: 'Escopo', conteudo: 'Texto' }],
    })
  })

  it('carrega prévia e permite fechar', async () => {
    const onClose = vi.fn()
    render(<OrcamentoOfertaPrintModal id="orc-1" onClose={onClose} />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByTestId('preview-doc')).toHaveTextContent('Proposta teste')
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalled()
    expect(obterPreviewOfertaOrcamentoMock).toHaveBeenCalledWith('orc-1')
  })

  it('chama onApply ao salvar no servidor', async () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(<OrcamentoOfertaPrintModal id="orc-1" onClose={onClose} onApply={onApply} />)

    await screen.findByTestId('preview-doc')
    fireEvent.change(screen.getByLabelText(/edição unificada/i), {
      target: { value: 'Novo texto\nCorpo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /salvar no servidor/i }))

    expect(onApply).toHaveBeenCalledWith('Novo texto\nCorpo')
    expect(onClose).toHaveBeenCalled()
  })

  it('dispara impressão local', async () => {
    render(<OrcamentoOfertaPrintModal id="orc-1" onClose={vi.fn()} />)

    await screen.findByTestId('preview-doc')
    fireEvent.click(screen.getByRole('button', { name: /imprimir \/ salvar pdf/i }))
    expect(imprimirMock).toHaveBeenCalled()
  })

  it('retorna null sem id', () => {
    const { container } = render(<OrcamentoOfertaPrintModal id="" onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
