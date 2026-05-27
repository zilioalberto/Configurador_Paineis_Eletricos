import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
const atualizarOfertaOrcamentoMock = vi.hoisted(() => vi.fn())
const reabrirOfertaOrcamentoMock = vi.hoisted(() => vi.fn())
const revisarPrecoCatalogoItemOrcamentoMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authUser(['orcamento.editar', 'catalogo.revisar_preco']),
  }),
}))

vi.mock('../services/orcamentosApi', () => ({
  atualizarOfertaOrcamento: (...args: unknown[]) => atualizarOfertaOrcamentoMock(...args),
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  obterOrcamento: (...args: unknown[]) => obterOrcamentoMock(...args),
  reabrirOfertaOrcamento: (...args: unknown[]) => reabrirOfertaOrcamentoMock(...args),
  revisarPrecoCatalogoItemOrcamento: (...args: unknown[]) =>
    revisarPrecoCatalogoItemOrcamentoMock(...args),
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
  atualizarOfertaOrcamentoMock.mockClear()
  reabrirOfertaOrcamentoMock.mockClear()
  revisarPrecoCatalogoItemOrcamentoMock.mockClear()
  obterOrcamentoMock.mockResolvedValue(orcamentoBase)
  atualizarOrcamentoMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...orcamentoBase,
    ...payload,
      itens: payload.itens ?? orcamentoBase.itens,
  }))
  atualizarOfertaOrcamentoMock.mockResolvedValue({
    itens_atualizados: 1,
    orcamento: orcamentoBase,
  })
  reabrirOfertaOrcamentoMock.mockResolvedValue({
    ...orcamentoBase,
    status: 'RASCUNHO',
    editavel: true,
    snapshot_envio: null,
  })
  revisarPrecoCatalogoItemOrcamentoMock.mockResolvedValue(orcamentoBase)
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

  it('carrega dados e salva proposta (cabeçalho e itens)', async () => {
    renderOrcamentoDetailPage()

    await screen.findByRole('heading', { name: 'ORC-2026-001 Rev A' })
    expect(screen.getByText('Cliente Industrial')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Painel QGBT')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Disjuntor caixa moldada')).toBeInTheDocument()
    expect(screen.getByText(/Produtos 20.00% · Serviços 35.00%/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Configurar margens do cliente' })).toHaveAttribute(
      'href',
      '/orcamentos/margens-clientes?cliente=cli-1'
    )
    expect(screen.getByRole('columnheader', { name: 'Código' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Painel' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Margem produtos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Margem serviços/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Guardar itens/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Título \/ referência/i), {
      target: { value: 'Painel CCM' },
    })
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'ENVIADO' },
    })
    fireEvent.change(screen.getByDisplayValue('Disjuntor caixa moldada'), {
      target: { value: 'Disjuntor 250A' },
    })
    fireEvent.change(screen.getByDisplayValue('2'), {
      target: { value: '2,5' },
    })
    fireEvent.change(screen.getByDisplayValue('100.00'), {
      target: { value: '100,55555' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }))

    await waitFor(() =>
      expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        expect.objectContaining({
          titulo: 'Painel CCM',
          status: 'ENVIADO',
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

    expect(await screen.findByText(/Custo obrigatório nas linhas/i)).toBeInTheDocument()
    const salvar = screen.getByRole('button', { name: 'Salvar proposta' })
    await waitFor(() => expect(salvar).toBeDisabled())
    expect(atualizarOrcamentoMock).not.toHaveBeenCalled()
  })

  it('mantém custo de catálogo somente leitura e não reidrata produto no save comum', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          produto_ncm: '85381000',
          custo_unitario: '100.00',
        },
      ],
    })

    renderOrcamentoDetailPage()

    const custoCatalogo = await screen.findByTitle(/Custo definido pela origem da linha/i)
    expect(custoCatalogo).toHaveTextContent('100.00')
    expect(screen.queryByDisplayValue('100.00')).not.toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Disjuntor caixa moldada'), {
      target: { value: 'Disjuntor caixa moldada ajustado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }))

    await waitFor(() => expect(atualizarOrcamentoMock).toHaveBeenCalled())
    const payload = atualizarOrcamentoMock.mock.calls.at(-1)?.[1] as {
      itens: Array<{ produto?: string | null; custo_unitario?: string }>
    }
    expect(payload.itens[0]).toMatchObject({
      descricao: 'Disjuntor caixa moldada ajustado',
      custo_unitario: '100',
    })
    expect(payload.itens[0]).not.toHaveProperty('produto')
  })

  it('destaca item de catálogo com preço vencido', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          catalogo_preco_atualizado_em: '2026-03-01T10:00:00Z',
          catalogo_preco_desatualizado: true,
        },
      ],
    })

    renderOrcamentoDetailPage()

    expect(await screen.findByText('Preço vencido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revisar preço' })).toBeInTheDocument()
    expect(screen.getByText('Preço vencido').closest('tr')).toHaveClass('table-warning')
  })

  it('revisa preço oficial do catálogo a partir da linha vencida', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          catalogo_preco_desatualizado: true,
        },
      ],
    })
    revisarPrecoCatalogoItemOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          custo_unitario: '150.00',
          catalogo_preco_desatualizado: false,
        },
      ],
    })

    renderOrcamentoDetailPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Revisar preço' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revisar preço do catálogo' })
    fireEvent.change(within(dialog).getByLabelText('Novo preço base'), {
      target: { value: '150,00' },
    })
    fireEvent.change(within(dialog).getByLabelText('Justificativa'), {
      target: { value: 'Cotação revisada do fornecedor.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revisar preço' }))

    await waitFor(() =>
      expect(revisarPrecoCatalogoItemOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        'item-1',
        '150',
        'Cotação revisada do fornecedor.'
      )
    )
    expect(await screen.findByText('150.00')).toBeInTheDocument()
    expect(screen.queryByText('Preço vencido')).not.toBeInTheDocument()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Preço do catálogo revisado e linha da oferta recalculada.',
      })
    )
  })

  it('permite renovar revisão mantendo o preço atual', async () => {
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          catalogo_preco_desatualizado: true,
        },
      ],
    })
    revisarPrecoCatalogoItemOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      itens: [
        {
          ...orcamentoBase.itens[0],
          origem: 'CATALOGO',
          produto: 'prod-1',
          produto_codigo: 'CAT-001',
          custo_unitario: '100.00',
          catalogo_preco_desatualizado: false,
        },
      ],
    })

    renderOrcamentoDetailPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Revisar preço' }))
    const dialog = await screen.findByRole('dialog', { name: 'Revisar preço do catálogo' })
    fireEvent.click(within(dialog).getByLabelText('Manter preço atual e apenas renovar a revisão'))
    fireEvent.change(within(dialog).getByLabelText('Justificativa'), {
      target: { value: 'Preço conferido e mantido.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Renovar revisão' }))

    await waitFor(() =>
      expect(revisarPrecoCatalogoItemOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        'item-1',
        '100',
        'Preço conferido e mantido.'
      )
    )
    expect(screen.queryByText('Preço vencido')).not.toBeInTheDocument()
  })

  it('atualiza oferta em rascunho com padrões atuais', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    atualizarOfertaOrcamentoMock.mockResolvedValueOnce({
      itens_atualizados: 1,
      orcamento: {
        ...orcamentoBase,
        margem_produtos_percentual: '25.00',
        margem_servicos_percentual: '40.00',
        itens: [
          {
            ...orcamentoBase.itens[0],
            custo_unitario: '120.00',
            margem_percentual: '25.00',
            preco_unitario: '150.00',
          },
        ],
      },
    })

    renderOrcamentoDetailPage()

    await screen.findByDisplayValue('Disjuntor caixa moldada')
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar oferta' }))

    await waitFor(() => expect(atualizarOfertaOrcamentoMock).toHaveBeenCalledWith('orc-1'))
    expect(await screen.findByDisplayValue('120.00')).toBeInTheDocument()
    expect(screen.getByText(/Produtos 25.00% · Serviços 40.00%/)).toBeInTheDocument()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: '1 linha(s) atualizada(s) com os padrões atuais.',
      })
    )

    confirmSpy.mockRestore()
  })

  it('finaliza oferta sem marcar como enviada', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    atualizarOrcamentoMock.mockImplementationOnce(async (_id: string, payload: Record<string, unknown>) => ({
      ...orcamentoBase,
      ...payload,
      status: 'FINALIZADO',
      editavel: false,
      snapshot_envio: {
        id: 'snap-1',
        codigo: orcamentoBase.codigo,
        status_orcamento: 'FINALIZADO',
        total: '300.0000',
        gerado_em: '2026-05-20T10:00:00Z',
        gerado_por: 1,
        dados: {},
        itens: [],
      },
      itens: payload.itens ?? orcamentoBase.itens,
    }))

    renderOrcamentoDetailPage()

    await screen.findByDisplayValue('Disjuntor caixa moldada')
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar oferta' }))

    await waitFor(() =>
      expect(atualizarOrcamentoMock).toHaveBeenCalledWith(
        'orc-1',
        expect.objectContaining({
          status: 'FINALIZADO',
        })
      )
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Oferta finalizada. Ela ainda não foi enviada ao cliente.',
      })
    )

    confirmSpy.mockRestore()
  })

  it('ao salvar proposta envia apenas linhas editáveis', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }))

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

  it('exibe mensagem detalhada da API quando falha ao salvar proposta', async () => {
    atualizarOrcamentoMock.mockRejectedValueOnce(
      new Error('Você não tem permissão para esta operação.')
    )

    renderOrcamentoDetailPage()

    await screen.findByDisplayValue('Disjuntor caixa moldada')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }))

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

  it('reabre oferta finalizada para edição em rascunho', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    obterOrcamentoMock.mockResolvedValueOnce({
      ...orcamentoBase,
      status: 'FINALIZADO',
      editavel: false,
      snapshot_envio: {
        id: 'snap-1',
        codigo: 'ORC-2026-001 Rev A',
        status_orcamento: 'FINALIZADO',
        total: '300.0000',
        gerado_em: '2026-05-20T10:00:00Z',
        gerado_por: 1,
        dados: {},
        itens: [],
      },
    })

    renderOrcamentoDetailPage()

    expect(await screen.findByRole('button', { name: 'Reabrir oferta' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reabrir oferta' }))

    await waitFor(() => expect(reabrirOfertaOrcamentoMock).toHaveBeenCalledWith('orc-1'))
    expect(await screen.findByRole('button', { name: 'Finalizar oferta' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Painel QGBT')).not.toBeDisabled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        message: 'Oferta reaberta em modo rascunho.',
      })
    )

    confirmSpy.mockRestore()
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
