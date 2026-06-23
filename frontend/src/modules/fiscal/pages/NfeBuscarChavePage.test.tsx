import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const importarNfesPorChaveSefazMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('../services/fiscalNfeService', () => ({
  importarNfesPorChaveSefaz: (...args: unknown[]) => importarNfesPorChaveSefazMock(...args),
}))

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

import NfeBuscarChavePage from './NfeBuscarChavePage'

const CHAVE_A = '35200114200166000187550010000000211000000017'
const CHAVE_B = '35200114200166000187550010000000221000000028'

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NfeBuscarChavePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NfeBuscarChavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('conta chaves válidas e ignora as inválidas', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/chaves de acesso/i), {
      target: { value: `${CHAVE_A}\n123\n${CHAVE_B}` },
    })
    expect(screen.getByText(/chave\(s\) válida\(s\)/i)).toHaveTextContent('2 chave(s) válida(s)')
    expect(screen.getByText(/1 ignorada/i)).toBeInTheDocument()
  })

  it('importa as chaves e mostra resultados com link para o documento', async () => {
    importarNfesPorChaveSefazMock.mockResolvedValue({
      sucesso: true,
      total: 1,
      importadas: 1,
      duplicadas: 0,
      resumos: 0,
      nao_encontradas: 0,
      erros: 0,
      resultados: [
        {
          chave: CHAVE_A,
          sucesso: true,
          status: 'importada',
          mensagem: 'NF-e importada da SEFAZ.',
          documento_id: 42,
          cstat: '138',
          motivo: 'ok',
        },
      ],
    })

    renderPage()
    fireEvent.change(screen.getByLabelText(/chaves de acesso/i), {
      target: { value: CHAVE_A },
    })
    fireEvent.click(screen.getByRole('button', { name: /buscar.*na sefaz/i }))

    await waitFor(() =>
      expect(importarNfesPorChaveSefazMock).toHaveBeenCalledWith([CHAVE_A]),
    )
    expect(await screen.findByText('Importada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute(
      'href',
      '/fiscal/nfes/42',
    )
  })

  it('bloqueia envio quando não há chave válida', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/chaves de acesso/i), {
      target: { value: '123 456' },
    })
    const botao = screen.getByRole('button', { name: /buscar.*na sefaz/i })
    expect(botao).toBeDisabled()
    expect(importarNfesPorChaveSefazMock).not.toHaveBeenCalled()
  })
})
