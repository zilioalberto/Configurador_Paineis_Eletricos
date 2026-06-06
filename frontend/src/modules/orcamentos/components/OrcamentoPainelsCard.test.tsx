import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToastMock = vi.fn()
const navigateMock = vi.fn()
const adicionarPainelMock = vi.fn()
const iniciarConfiguradorMock = vi.fn()
const obterOrcamentoMock = vi.fn()
const sincronizarMock = vi.fn()
const criarRevisaoMock = vi.fn()

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../services/orcamentosApi', () => ({
  adicionarPainelConfigurador: (...args: unknown[]) => adicionarPainelMock(...args),
  criarNovaRevisaoOrcamento: (...args: unknown[]) => criarRevisaoMock(...args),
  iniciarConfiguradorPainel: (...args: unknown[]) => iniciarConfiguradorMock(...args),
  obterOrcamento: (...args: unknown[]) => obterOrcamentoMock(...args),
  sincronizarComposicaoPainel: (...args: unknown[]) => sincronizarMock(...args),
}))

import OrcamentoPainelsCard from './OrcamentoPainelsCard'
import type { OrcamentoDto } from '../types/orcamentos'

const orcamentoBase: OrcamentoDto = {
  id: 'orc-1',
  codigo: 'Prop-05012-26 Rev A',
  codigo_base: 'Prop-05012-26',
  revisao: 'A',
  tipo_revisao: 'INICIAL',
  orcamento_origem: null,
  editavel: true,
  titulo: 'Proposta',
  descricao: '',
  cliente: 'c1',
  cliente_nome: 'Cliente',
  contato_cliente: null,
  contato_cliente_nome: '',
  contato_cliente_email: '',
  contato_cliente_telefone: '',
  cliente_referencia: '',
  margem_produtos_percentual: '20',
  margem_servicos_percentual: '30',
  perfil_oferta: 'MATERIAIS',
  status: 'ENVIADO',
  valido_ate: null,
  criado_em: '',
  atualizado_em: '',
  itens: [],
  configuradores_painel: [
    {
      id: 'vp-1',
      ordem: 1,
      descricao_painel: 'Painel 01',
      modo: 'ATIVO',
      projeto_configurador_id: 'proj-1',
      projeto_configurador_codigo: 'CPQ-1',
      projeto_configurador_origem_id: null,
      configurador_painel_origem_id: null,
      pendencias_abertas: 0,
      sincronizado_em: null,
      criado_em: '',
      atualizado_em: '',
    },
  ],
}

const painelBase = orcamentoBase.configuradores_painel![0]

function renderCard(orcamento: OrcamentoDto = orcamentoBase, podeEditar = true) {
  const onAtualizado = vi.fn()
  render(
    <MemoryRouter>
      <OrcamentoPainelsCard orcamento={orcamento} podeEditar={podeEditar} onAtualizado={onAtualizado} />
    </MemoryRouter>
  )
  return { onAtualizado }
}

describe('OrcamentoPainelsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    obterOrcamentoMock.mockResolvedValue(orcamentoBase)
    adicionarPainelMock.mockResolvedValue({ id: 'vp-2' })
    iniciarConfiguradorMock.mockResolvedValue({
      ...painelBase,
      projeto_configurador_id: 'proj-1',
    })
    sincronizarMock.mockResolvedValue({
      itens_sincronizados: 2,
      orcamento: orcamentoBase,
    })
    criarRevisaoMock.mockResolvedValue({
      ...orcamentoBase,
      id: 'orc-2',
      codigo: 'Prop-05012-26 Rev B',
    })
  })

  it('adiciona painel quando descrição é informada', async () => {
    const { onAtualizado } = renderCard()
    fireEvent.change(screen.getByLabelText(/Novo painel na proposta/i), {
      target: { value: 'Painel extra' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar painel/i }))

    await waitFor(() => expect(adicionarPainelMock).toHaveBeenCalledWith('orc-1', 'Painel extra'))
    await waitFor(() => expect(onAtualizado).toHaveBeenCalled())
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    )
  })

  it('avisa quando tenta adicionar painel sem descrição', async () => {
    renderCard()
    fireEvent.change(screen.getByLabelText(/Novo painel na proposta/i), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar painel/i }))
    expect(adicionarPainelMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning' })
    )
  })

  it('inicia configurador preservando o retorno para o orçamento', async () => {
    const orcamentoSemProjeto = {
      ...orcamentoBase,
      configuradores_painel: [
        {
          ...painelBase,
          projeto_configurador_id: null,
          projeto_configurador_codigo: '',
        },
      ],
    }
    renderCard(orcamentoSemProjeto)

    fireEvent.click(screen.getByRole('button', { name: /Configurar painel/i }))

    await waitFor(() =>
      expect(iniciarConfiguradorMock).toHaveBeenCalledWith('orc-1', 'vp-1')
    )
    expect(navigateMock).toHaveBeenCalledWith(
      '/configurador/cargas?projeto=proj-1&orcamento=orc-1&vinculo=vp-1'
    )
  })

  it('sincroniza composição do painel vinculado', async () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Sincronizar composição/i }))
    await waitFor(() =>
      expect(sincronizarMock).toHaveBeenCalledWith('orc-1', 'vp-1')
    )
  })

  it('mantém origem do orçamento ao continuar configurador existente', () => {
    renderCard()

    expect(screen.getByRole('link', { name: /Continuar configurador/i })).toHaveAttribute(
      'href',
      '/configurador/composicao?projeto=proj-1&orcamento=orc-1&vinculo=vp-1'
    )
  })

  it('cria revisão comercial e navega para novo orçamento', async () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Revisão comercial/i }))
    fireEvent.click(screen.getByRole('button', { name: /Criar revisão/i }))

    await waitFor(() =>
      expect(criarRevisaoMock).toHaveBeenCalledWith('orc-1', { tipo_revisao: 'COMERCIAL' })
    )
    expect(navigateMock).toHaveBeenCalledWith('/orcamentos/orc-2')
  })

  it('bloqueia revisão técnica sem painel selecionado', async () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Revisão técnica/i }))
    fireEvent.click(screen.getByRole('button', { name: /Criar revisão/i }))
    expect(criarRevisaoMock).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning' })
    )
  })
})
