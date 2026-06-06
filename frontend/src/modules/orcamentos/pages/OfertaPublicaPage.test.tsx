import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const obterOfertaPublicaMock = vi.hoisted(() => vi.fn())
const responderOfertaPublicaMock = vi.hoisted(() => vi.fn())

vi.mock('../components/AssinaturaCanvas', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('data:image/png;base64,x')}>
      Mock assinatura
    </button>
  ),
}))

vi.mock('../components/PropostaClienteDocument', () => ({
  default: ({ preview }: { preview: { titulo?: string } }) => (
    <div data-testid="proposta-doc">{preview.titulo ?? 'Proposta'}</div>
  ),
}))

vi.mock('../services/ofertaPublicaApi', () => ({
  obterOfertaPublica: (...args: unknown[]) => obterOfertaPublicaMock(...args),
  responderOfertaPublica: (...args: unknown[]) => responderOfertaPublicaMock(...args),
  enviarPdfAssinadoOfertaPublica: vi.fn(),
}))

import OfertaPublicaPage from './OfertaPublicaPage'

function renderPage(token = 'tok-1') {
  return render(
    <MemoryRouter initialEntries={[`/oferta/${token}`]}>
      <Routes>
        <Route path="/oferta/:token" element={<OfertaPublicaPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OfertaPublicaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterOfertaPublicaMock.mockResolvedValue({
      codigo: 'Prop-05001-26 Rev A',
      valido_ate: '2026-12-31',
      preview: { titulo: 'Materiais' },
      resposta: { decisao: 'PENDENTE', nome_responsavel: '', aceite_em: null, observacao: '' },
    })
  })

  it('carrega proposta pública e exibe formulário de aceite', async () => {
    renderPage()

    expect(await screen.findByText(/ZFW Engenharia/i)).toBeInTheDocument()
    expect(screen.getByTestId('proposta-doc')).toHaveTextContent('Materiais')
    expect(screen.getByRole('button', { name: /aprovar proposta/i })).toBeDisabled()
    expect(obterOfertaPublicaMock).toHaveBeenCalledWith('tok-1')
  })

  it('mostra link inválido sem token', () => {
    render(
      <MemoryRouter initialEntries={['/oferta']}>
        <Routes>
          <Route path="/oferta" element={<OfertaPublicaPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/link inválido/i)).toBeInTheDocument()
  })

  it('aprova proposta quando nome preenchido', async () => {
    responderOfertaPublicaMock.mockResolvedValue({ decisao: 'APROVADO', mensagem: 'OK' })
    renderPage()

    await screen.findByRole('button', { name: /aprovar proposta/i })
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Maria Silva' } })
    fireEvent.click(screen.getByRole('button', { name: /aprovar proposta/i }))

    await waitFor(() =>
      expect(responderOfertaPublicaMock).toHaveBeenCalledWith(
        'tok-1',
        expect.objectContaining({
          decisao: 'APROVADO',
          nome_responsavel: 'Maria Silva',
        })
      )
    )
  })

  it('exibe erro quando carga falha', async () => {
    obterOfertaPublicaMock.mockRejectedValueOnce(new Error('Convite expirado'))
    renderPage()

    expect(await screen.findByText('Convite expirado')).toBeInTheDocument()
  })
})
