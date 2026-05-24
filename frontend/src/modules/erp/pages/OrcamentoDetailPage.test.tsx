import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const obterOrcamentoMock = vi.hoisted(() => vi.fn())
const atualizarOrcamentoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authUser(['orcamento.editar']),
  }),
}))

vi.mock('../services/erpApi', () => ({
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  obterOrcamento: (...args: unknown[]) => obterOrcamentoMock(...args),
}))

import OrcamentoDetailPage from './OrcamentoDetailPage'

const orcamentoBase = {
  id: 'orc-1',
  codigo: 'ORC-2026-001 Rev A',
  codigo_base: 'ORC-2026-001',
  revisao: 'A',
  tipo_revisao: 'INICIAL',
  orcamento_origem: null,
  editavel: true,
  titulo: 'Painel QGBT',
  descricao: 'Escopo inicial',
  cliente: 'cli-1',
  cliente_nome: 'Cliente Industrial',
  contato_cliente: 'cont-1',
  contato_cliente_nome: 'Joana Compras',
  contato_cliente_email: 'joana@empresa.com',
  cliente_referencia: '',
  margem_produtos_percentual: '20.00',
  margem_servicos_percentual: '35.00',
  status: 'RASCUNHO',
  valido_ate: '2026-06-30',
  criado_em: '2026-05-01T10:00:00Z',
  atualizado_em: '2026-05-02T10:00:00Z',
  itens: [
    {
      id: 'item-1',
      ordem: 0,
      tipo: 'PRODUTO',
      origem: 'MANUAL',
      descricao: 'Disjuntor caixa moldada',
      quantidade: '2',
      custo_unitario: '100.00',
      margem_percentual: '20.00',
      preco_unitario: '150.00',
      editavel: true,
    },
  ],
  configuradores_painel: [],
}

function setupOrcamentoDetailPage() {
  showToastMock.mockClear()
  obterOrcamentoMock.mockResolvedValue(orcamentoBase)
  atualizarOrcamentoMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...orcamentoBase,
    ...payload,
    itens: payload.itens ?? orcamentoBase.itens,
  }))
}

function renderOrcamentoDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/erp/orcamentos/orc-1']}>
      <Routes>
        <Route path="/erp/orcamentos/:id" element={<OrcamentoDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OrcamentoDetailPage', () => {
  beforeEach(setupOrcamentoDetailPage)

  it('carrega dados, salva cabecalho e itens', async () => {
    renderOrcamentoDetailPage()

    await screen.findByRole('heading', { name: 'ORC-2026-001 Rev A' })
    expect(screen.getByText('Cliente Industrial')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Painel QGBT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Disjuntor caixa moldada')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Título da proposta'), {
      target: { value: 'Painel CCM' },
    })
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'ENVIADO' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar dados' }))

    await waitFor(() => expect(atualizarOrcamentoMock).toHaveBeenCalled())
    expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
      'orc-1',
      expect.objectContaining({
        titulo: 'Painel CCM',
        status: 'ENVIADO',
      })
    )

    fireEvent.change(screen.getByDisplayValue('Disjuntor caixa moldada'), {
      target: { value: 'Disjuntor 250A' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar itens' }))

    await waitFor(() =>
      expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        expect.objectContaining({
          itens: [
            expect.objectContaining({
              descricao: 'Disjuntor 250A',
              quantidade: '2',
            }),
          ],
        })
      )
    )
  })

  it('mostra mensagem para identificador invalido', () => {
    render(
      <MemoryRouter initialEntries={['/erp/orcamentos']}>
        <Routes>
          <Route path="/erp/orcamentos" element={<OrcamentoDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Identificador inválido.')).toBeInTheDocument()
  })
})
