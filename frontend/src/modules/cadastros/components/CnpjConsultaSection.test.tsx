import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToastMock = vi.fn()
const consultarCnpjMock = vi.fn()
const salvarParceiroPorCnpjMock = vi.fn()
const atualizarParceiroPorCnpjMock = vi.fn()

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../services/cadastrosApi', () => ({
  consultarCnpj: (...args: unknown[]) => consultarCnpjMock(...args),
  salvarParceiroPorCnpj: (...args: unknown[]) => salvarParceiroPorCnpjMock(...args),
  atualizarParceiroPorCnpj: (...args: unknown[]) => atualizarParceiroPorCnpjMock(...args),
}))

import CnpjConsultaSection from './CnpjConsultaSection'
import type { CnpjConsultaDto } from '../types/cnpj'
import type { ParceiroComercialDto } from '../types/cadastros'

const consultaNova: CnpjConsultaDto = {
  documento: '11222333000144',
  razao_social: 'Empresa Receita LTDA',
  nome_fantasia: 'Empresa',
  email: 'contato@empresa.com',
  telefone: '41999998888',
  situacao_cadastral: 'ATIVA',
  situacao_cadastral_codigo: 2,
  data_inicio_atividade: '2010-01-15',
  capital_social: '100000',
  cnae_fiscal: '6201500',
  cnae_fiscal_descricao: 'Desenvolvimento de software',
  natureza_juridica: 'Sociedade limitada',
  matriz_filial: 'Matriz',
  endereco: {
    nome: 'Sede',
    logradouro: 'Rua Teste',
    numero: '100',
    complemento: '',
    bairro: 'Centro',
    municipio: 'Curitiba',
    uf: 'PR',
    cep: '80000000',
    principal: true,
  },
  cnaes: [{ codigo: '6201500', descricao: 'TI', principal: true }],
  socios: [
    {
      nome: 'João Silva',
      qualificacao: 'Sócio',
      data_entrada: '2010-01-15',
      faixa_etaria: '41 a 50',
    },
  ],
  consultado_em: '2026-05-23T10:00:00Z',
  ja_cadastrado: false,
}

const parceiroSalvo: ParceiroComercialDto = {
  id: 'par-cnpj',
  tipo_pessoa: 'PJ',
  documento: '11222333000144',
  razao_social: 'Empresa Receita LTDA',
  nome_fantasia: 'Empresa',
  inscricao_estadual: '',
  email: 'contato@empresa.com',
  telefone: '41999998888',
  eh_cliente: true,
  eh_fornecedor: false,
  eh_parceiro: false,
  ativo: true,
  origem: 'BRASILAPI',
  contatos: [],
  enderecos: [],
}

function renderSection(props: Partial<Parameters<typeof CnpjConsultaSection>[0]> = {}) {
  const onAplicarFormulario = vi.fn()
  const onSalvo = vi.fn()
  render(
    <CnpjConsultaSection
      canEdit
      onAplicarFormulario={onAplicarFormulario}
      onSalvo={onSalvo}
      {...props}
    />
  )
  return { onAplicarFormulario, onSalvo }
}

describe('CnpjConsultaSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consultarCnpjMock.mockResolvedValue(consultaNova)
    salvarParceiroPorCnpjMock.mockResolvedValue({
      parceiro: parceiroSalvo,
      consulta: { ...consultaNova, ja_cadastrado: true, parceiro_existente_id: 'par-cnpj' },
    })
    atualizarParceiroPorCnpjMock.mockResolvedValue({
      parceiro: parceiroSalvo,
      consulta: { ...consultaNova, ja_cadastrado: true },
    })
  })

  it('preenche CNPJ inicial com máscara', () => {
    renderSection({ cnpjInicial: '11222333000144' })
    expect(screen.getByLabelText('CNPJ')).toHaveValue('11.222.333/0001-44')
  })

  it('consulta CNPJ e exibe preview', async () => {
    renderSection()
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    await waitFor(() => expect(consultarCnpjMock).toHaveBeenCalledWith('11222333000144'))
    expect(screen.getByText('Empresa Receita LTDA')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('TI')).toBeInTheDocument()
  })

  it('exibe erro quando consulta falha', async () => {
    consultarCnpjMock.mockRejectedValueOnce({ response: { data: { detail: 'CNPJ inválido' } } })
    renderSection()
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'danger', title: 'Consulta CNPJ' })
      )
    )
  })

  it('aplica dados no formulário manual', async () => {
    const { onAplicarFormulario } = renderSection()
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Empresa Receita LTDA')

    fireEvent.click(screen.getByRole('button', { name: 'Usar no formulário' }))
    expect(onAplicarFormulario).toHaveBeenCalledWith(
      expect.objectContaining({
        documento: '11222333000144',
        razao_social: 'Empresa Receita LTDA',
        endereco: consultaNova.endereco,
      })
    )
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    )
  })

  it('salva parceiro a partir da consulta', async () => {
    const { onSalvo } = renderSection()
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await screen.findByText('Empresa Receita LTDA')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar no cadastro' }))

    await waitFor(() =>
      expect(salvarParceiroPorCnpjMock).toHaveBeenCalledWith(
        '11222333000144',
        expect.objectContaining({ eh_cliente: true })
      )
    )
    expect(onSalvo).toHaveBeenCalledWith(parceiroSalvo)
  })

  it('atualiza parceiro já cadastrado', async () => {
    consultarCnpjMock.mockResolvedValueOnce({
      ...consultaNova,
      ja_cadastrado: true,
      parceiro_existente_id: 'par-cnpj',
      parceiro_existente_nome: 'Empresa Receita LTDA',
      parceiro_existente_eh_cliente: true,
      parceiro_existente_eh_fornecedor: false,
      parceiro_existente_eh_parceiro: false,
    })
    const { onSalvo } = renderSection({ parceiroSelecionadoId: 'par-cnpj' })
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await screen.findByText(/já está cadastrado/i)

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar dados da Receita' }))

    await waitFor(() =>
      expect(atualizarParceiroPorCnpjMock).toHaveBeenCalledWith(
        '11222333000144',
        expect.objectContaining({ parceiro_id: 'par-cnpj' })
      )
    )
    expect(onSalvo).toHaveBeenCalledWith(parceiroSalvo)
  })

  it('alerta situação inativa na Receita', async () => {
    consultarCnpjMock.mockResolvedValueOnce({
      ...consultaNova,
      situacao_cadastral: 'BAIXADA',
    })
    renderSection()
    fireEvent.change(screen.getByLabelText('CNPJ'), {
      target: { value: '11.222.333/0001-44' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/Situação na Receita/i)
    expect(alerta).toHaveTextContent('BAIXADA')
  })
})
