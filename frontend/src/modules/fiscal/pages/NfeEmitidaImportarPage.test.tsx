import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const importarDocumentoEmitidoManualMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfeService', () => ({
  importarDocumentoEmitidoManual: (...args: unknown[]) => importarDocumentoEmitidoManualMock(...args),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import NfeEmitidaImportarPage from './NfeEmitidaImportarPage'

describe('NfeEmitidaImportarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    importarDocumentoEmitidoManualMock.mockResolvedValue({
      created: true,
      message: 'Importado',
      documento_id: 9,
      identificador: 'NFSE:9',
    })
  })

  it('importa XML emitido como NFS-e de serviço', async () => {
    render(
      <MemoryRouter>
        <NfeEmitidaImportarPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/tipo de documento/i), {
      target: { value: 'NFSE_SERVICO' },
    })
    fireEvent.change(screen.getByLabelText(/ou cole o xml/i), {
      target: { value: '<CompNfse />' },
    })
    fireEvent.click(screen.getByRole('button', { name: /importar saída/i }))

    await waitFor(() => expect(importarDocumentoEmitidoManualMock).toHaveBeenCalled())
    expect(importarDocumentoEmitidoManualMock).toHaveBeenCalledWith({
      xml: '<CompNfse />',
      tipo_documento: 'NFSE_SERVICO',
      objetivo_saida: 'PRESTACAO_SERVICO',
    })
    expect(navigateMock).toHaveBeenCalledWith('/fiscal/relatorios/nfes')
  })
})
