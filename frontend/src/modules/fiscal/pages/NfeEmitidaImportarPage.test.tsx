import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const importarDocumentoEmitidoManualMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfeService', () => ({
  importarDocumentoEmitidoManual: (...args: unknown[]) => importarDocumentoEmitidoManualMock(...args),
  importarLoteDocumentosEmitidos: vi.fn(),
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

  it('importa XML com classificação automática', async () => {
    render(
      <MemoryRouter>
        <NfeEmitidaImportarPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/ou cole o xml/i), {
      target: { value: '<CompNfse />' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^importar$/i }))

    await waitFor(() => expect(importarDocumentoEmitidoManualMock).toHaveBeenCalled())
    expect(importarDocumentoEmitidoManualMock).toHaveBeenCalledWith({
      xml: '<CompNfse />',
    })
    expect(navigateMock).toHaveBeenCalledWith('/fiscal/nfes-emitidas')
  })
})
