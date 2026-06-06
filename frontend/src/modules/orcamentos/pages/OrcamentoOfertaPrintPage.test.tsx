import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarState,
} from '@/components/layout/AppPageToolbarContext'

const showToastMock = vi.hoisted(() => vi.fn())
const obterPreviewOfertaOrcamentoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../services/orcamentosApi', () => ({
  obterPreviewOfertaOrcamento: (...args: unknown[]) => obterPreviewOfertaOrcamentoMock(...args),
}))

import OrcamentoOfertaPrintPage from './OrcamentoOfertaPrintPage'

function ToolbarProbe() {
  const toolbar = useAppPageToolbarState()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orcamentos/orc-1/oferta']}>
      <AppPageToolbarProvider>
        <ToolbarProbe />
        <Routes>
          <Route path="/orcamentos/:id/oferta" element={<OrcamentoOfertaPrintPage />} />
        </Routes>
      </AppPageToolbarProvider>
    </MemoryRouter>
  )
}

describe('OrcamentoOfertaPrintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterPreviewOfertaOrcamentoMock.mockResolvedValue({
      codigo: 'Prop-05022-26 Rev A',
      codigo_base: 'Prop-05022-26',
      revisao: 'A',
      titulo: 'Materiais SIEMENS',
      perfil_oferta: 'MATERIAIS',
      emissao: '2026-06-01',
      cliente: {
        id: 'cli-1',
        nome: 'Cipla',
        contato: 'Rafael Trindade',
        email: 'rafael@example.com',
        telefone: '+55 47 99999-1234',
      },
      validade: '2026-05-31',
      secoes: [
        {
          tipo: 'ESCOPO',
          titulo: 'Escopo de fornecimento',
          conteudo: 'Fornecimento de materiais conforme tabela.',
        },
        {
          tipo: 'CONDICOES_PAGAMENTO',
          titulo: 'Condições de pagamento',
          conteudo: '50% na OS e 50% na entrega.',
        },
      ],
      investimento: {
        modo: 'ITENS_UNITARIOS',
        titulo: 'Investimento',
        itens: [
          {
            id: 'item-1',
            codigo: 'SIEMENS-01',
            descricao: 'Disjuntor Siemens',
            quantidade: '2',
            preco_unitario: '120',
            subtotal: '240',
            ncm: '85361000',
          },
        ],
      },
      totais: {
        produtos: '240',
        servicos: '0',
        subtotal: '240',
        desconto_ativo: false,
        desconto_percentual: '0',
        desconto_valor: '0',
        impostos_percentual: '0',
        impostos_valor: '0',
        total: '240',
      },
      apendice_legal: {
        versao: '2026.1',
        secoes: [{ id: 'entrega', titulo: 'Entrega', conteudo: 'FOB Joinville.' }],
      },
    })
  })

  it('renderiza modelo de oferta comercial estilo Figma', async () => {
    renderPage()

    expect(await screen.findByText(/oferta comercial/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /destinatário/i })).toBeInTheDocument()
    expect(screen.getByText('Telefone', { selector: '.proposta-cliente__campo-rotulo' })).toBeInTheDocument()
    expect(screen.getByText('+55 47 99999-1234')).toBeInTheDocument()
    expect(screen.queryByText('Cargo', { selector: '.proposta-cliente__campo-rotulo' })).not.toBeInTheDocument()
    expect(screen.getByText('Número', { selector: '.proposta-cliente__caixa-meta-grid dt' })).toBeInTheDocument()
    expect(obterPreviewOfertaOrcamentoMock).toHaveBeenCalledWith('orc-1')
    expect(screen.getByText('Como o cliente verá')).toBeInTheDocument()
    expect(
      await screen.findByText(/visualização enviada ao cliente/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Materiais SIEMENS')).toBeInTheDocument()
    expect(screen.getAllByText('Cipla').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Fornecimento de materiais conforme tabela.')).toBeInTheDocument()
    expect(screen.getByText('Disjuntor Siemens')).toBeInTheDocument()
    expect(screen.getByText(/total geral/i)).toBeInTheDocument()
    expect(screen.queryByText(/^produtos$/i)).not.toBeInTheDocument()
    expect(screen.getByText('85361000')).toBeInTheDocument()
    expect(screen.getByText(/Termos e condições gerais/i)).toBeInTheDocument()
    expect(document.querySelector('.proposta-cliente__rodape-impressao')).toBeInTheDocument()
    expect(document.body).toHaveClass('proposta-cliente-impressao-ativa')
    expect(document.querySelector('.proposta-cliente--pagina-impressao')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /investimento/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^descrição$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^ncm$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /valor unit/i })).toBeInTheDocument()
    expect(screen.getByText(/ESCOPO DE FORNECIMENTO/i)).toBeInTheDocument()
    expect(screen.getByText(/CONDIÇÕES DE PAGAMENTO/i)).toBeInTheDocument()
    expect(screen.getByText(/aceite e assinatura/i)).toBeInTheDocument()
  })

  it('mostra erro quando a prévia não carrega', async () => {
    obterPreviewOfertaOrcamentoMock.mockRejectedValueOnce(new Error('falhou'))

    renderPage()

    await waitFor(() => expect(showToastMock).toHaveBeenCalled())
    expect(await screen.findByText(/Proposta não encontrada/i)).toBeInTheDocument()
  })
})
