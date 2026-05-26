import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppPageToolbar from '@/components/layout/AppPageToolbar'
import {
  AppPageToolbarProvider,
  useAppPageToolbarState,
} from '@/components/layout/AppPageToolbarContext'
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

function ToolbarProbe() {
  const toolbar = useAppPageToolbarState()
  return toolbar ? <AppPageToolbar toolbar={toolbar} /> : null
}

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
  atualizarOrcamentoMock.mockClear()
  obterOrcamentoMock.mockResolvedValue(orcamentoBase)
  atualizarOrcamentoMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...orcamentoBase,
    ...payload,
    itens: payload.itens ?? orcamentoBase.itens,
  }))
}

function renderOrcamentoDetailPage() {
  return render(
    <MemoryRouter initialEntries={['/orcamentos/orc-1']}>
      <AppPageToolbarProvider>
        <ToolbarProbe />
        <Routes>
          <Route path="/orcamentos/:id" element={<OrcamentoDetailPage />} />
        </Routes>
      </AppPageToolbarProvider>
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
    expect(screen.queryByLabelText(/Margem produtos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Margem serviços/i)).not.toBeInTheDocument()

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
    fireEvent.change(screen.getByDisplayValue('2'), {
      target: { value: '2,5' },
    })
    fireEvent.change(screen.getByDisplayValue('100.00'), {
      target: { value: '100,55555' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar itens' }))

    await waitFor(() =>
      expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        expect.objectContaining({
          itens: [
            expect.objectContaining({
              descricao: 'Disjuntor 250A',
              quantidade: '2.5',
              custo_unitario: '100.5555',
            }),
          ],
        })
      )
    )
    const payload = atualizarOrcamentoMock.mock.calls.at(-1)?.[1] as {
      itens: Array<{ preco_unitario?: string }>
    }
    expect(payload.itens[0].preco_unitario).toBeUndefined()
  })

  it('bloqueia produto com custo zerado', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          custo_unitario: '0',
          preco_unitario: '0',
        },
      ],
    })

    renderOrcamentoDetailPage()

    expect(await screen.findByText(/Produto com custo zerado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar itens' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Custo obrigatório',
        })
      )
    )
    expect(atualizarOrcamentoMock).not.toHaveBeenCalled()
  })

  it('ao guardar itens envia apenas linhas editáveis', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          id: 'hist-1',
          ordem: 0,
          tipo: 'PRODUTO',
          origem: 'HERANCA_REVISAO',
          descricao: 'Linha herdada',
          quantidade: '1',
          custo_unitario: '0',
          margem_percentual: '20.00',
          preco_unitario: '0',
          editavel: false,
        },
        {
          ...orcamentoBase.itens[0],
          ordem: 1,
        },
      ],
    })

    renderOrcamentoDetailPage()

    expect(await screen.findByText('Linha herdada')).toBeInTheDocument()
    expect(screen.queryByText(/Produto com custo zerado/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar itens' }))

    await waitFor(() =>
      expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        expect.objectContaining({
          itens: [
            expect.objectContaining({
              id: 'item-1',
              descricao: 'Disjuntor caixa moldada',
            }),
          ],
        })
      )
    )
    const payload = atualizarOrcamentoMock.mock.calls.at(-1)?.[1] as {
      itens: Array<{ id?: string }>
    }
    expect(payload.itens).toHaveLength(1)
    expect(payload.itens[0].id).toBe('item-1')
  })

  it('exibe mensagem detalhada da API quando falha ao guardar itens', async () => {
    atualizarOrcamentoMock.mockRejectedValueOnce(
      new Error('Você não tem permissão para esta operação.')
    )

    renderOrcamentoDetailPage()

    await screen.findByDisplayValue('Disjuntor caixa moldada')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar itens' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          message: 'Você não tem permissão para esta operação.',
        })
      )
    )
  })

  it('exibe acesso às revisões quando a proposta tem oferta congelada', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      status: 'ENVIADO',
      editavel: false,
      snapshot_envio: {
        id: 'snap-1',
        codigo: 'ORC-2026-001 Rev A',
        status_orcamento: 'ENVIADO',
        total: '300.0000',
        gerado_em: '2026-05-20T10:00:00Z',
        gerado_por: 1,
        dados: {},
        itens: [],
      },
      revisoes_derivadas: [
        {
          id: 'orc-2',
          codigo: 'ORC-2026-001 Rev B',
          codigo_base: 'ORC-2026-001',
          revisao: 'B',
          tipo_revisao: 'COMERCIAL',
          status: 'RASCUNHO',
          titulo: 'Painel QGBT',
          criado_em: '2026-05-21T10:00:00Z',
          atualizado_em: '2026-05-21T10:00:00Z',
          snapshot_envio: null,
        },
      ],
    })

    renderOrcamentoDetailPage()

    expect(
      await screen.findByText(/Apenas propostas em rascunho podem ser alteradas/i)
    ).toBeInTheDocument()
    expect(await screen.findByText('Revisões da oferta')).toBeInTheDocument()
    expect(screen.getByText('ORC-2026-001 Rev B')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/orcamentos/orc-2'
    )
  })

  it('mostra mensagem para identificador invalido', () => {
    render(
      <MemoryRouter initialEntries={['/orcamentos']}>
        <AppPageToolbarProvider>
          <ToolbarProbe />
          <Routes>
            <Route path="/orcamentos" element={<OrcamentoDetailPage />} />
          </Routes>
        </AppPageToolbarProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Identificador inválido.')).toBeInTheDocument()
  })
})
