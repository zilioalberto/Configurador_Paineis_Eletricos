import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useNfseRecebidaDetailQueryMock = vi.hoisted(() => vi.fn())
const PUBLIC_ID = '22222222-2222-4222-8222-222222222222'

vi.mock('../hooks/useNfseRecebidaDetailQuery', () => ({
  useNfseRecebidaDetailQuery: (...args: unknown[]) => useNfseRecebidaDetailQueryMock(...args),
}))

import NfseRecebidaDetailPage from './NfseRecebidaDetailPage'

function renderPage(publicId: string) {
  return render(
    <MemoryRouter initialEntries={[`/fiscal/nfse-recebidas/${publicId}`]}>
      <Routes>
        <Route path="/fiscal/nfse-recebidas/:id" element={<NfseRecebidaDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('NfseRecebidaDetailPage', () => {
  beforeEach(() => {
    useNfseRecebidaDetailQueryMock.mockReset()
  })

  it('mostra aviso quando public_id é inválido', () => {
    useNfseRecebidaDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage('abc')
    expect(screen.getByText(/identificador da nfs-e inválido/i)).toBeInTheDocument()
    expect(useNfseRecebidaDetailQueryMock).toHaveBeenCalledWith('abc', false)
  })

  it('renderiza cabeçalho quando detalhe carrega', () => {
    useNfseRecebidaDetailQueryMock.mockReturnValue({
      data: {
        id: 1,
        public_id: PUBLIC_ID,
        numero: '12345',
        chave_acesso: '',
        status_importacao: 'RECEBIDA',
        origem_importacao: 'ADN_SYNC',
        objetivo_entrada: 'OUTRAS_ENTRADAS',
        cnpj_prestador: '12345678000199',
        nome_prestador: 'Prestador Teste',
        cnpj_tomador: '07284171000139',
        nome_tomador: 'ZFW',
        codigo_verificacao: 'ABC123',
        valor_total: '1500.00',
        data_emissao: '2026-06-10T12:00:00Z',
        descricao_servico: 'Serviço de engenharia',
        nsu_adn: '000000000000001',
        criada_em: '2026-06-10T12:05:00Z',
        atualizada_em: '2026-06-10T12:05:00Z',
        itens: [{ id: 1, numero_item: 1, descricao: 'Item 1', valor_total: '1500.00' }],
        xml_original: '<CompNfse/>',
      },
      isPending: false,
      isError: false,
      error: null,
    })

    renderPage(PUBLIC_ID)

    expect(useNfseRecebidaDetailQueryMock).toHaveBeenCalledWith(PUBLIC_ID, true)
    expect(screen.getByRole('heading', { name: /nfs-e 12345/i })).toBeInTheDocument()
    expect(screen.getByText('Prestador Teste')).toBeInTheDocument()
    expect(screen.getByText('Serviço de engenharia')).toBeInTheDocument()
  })
})
