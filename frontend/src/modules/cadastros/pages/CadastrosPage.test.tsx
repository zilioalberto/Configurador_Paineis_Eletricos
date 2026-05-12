import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const listarParceirosMock = vi.hoisted(() => vi.fn())
const obterParceiroMock = vi.hoisted(() => vi.fn())
const criarParceiroMock = vi.hoisted(() => vi.fn())
const atualizarParceiroMock = vi.hoisted(() => vi.fn())
const excluirParceiroMock = vi.hoisted(() => vi.fn())
const criarContatoParceiroMock = vi.hoisted(() => vi.fn())
const atualizarContatoParceiroMock = vi.hoisted(() => vi.fn())
const excluirContatoParceiroMock = vi.hoisted(() => vi.fn())
const criarEnderecoParceiroMock = vi.hoisted(() => vi.fn())
const atualizarEnderecoParceiroMock = vi.hoisted(() => vi.fn())
const excluirEnderecoParceiroMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authUser(['cadastro.editar']),
  }),
}))

vi.mock('../services/cadastrosApi', () => ({
  atualizarContatoParceiro: (...args: unknown[]) => atualizarContatoParceiroMock(...args),
  atualizarEnderecoParceiro: (...args: unknown[]) => atualizarEnderecoParceiroMock(...args),
  atualizarParceiro: (...args: unknown[]) => atualizarParceiroMock(...args),
  criarContatoParceiro: (...args: unknown[]) => criarContatoParceiroMock(...args),
  criarEnderecoParceiro: (...args: unknown[]) => criarEnderecoParceiroMock(...args),
  criarParceiro: (...args: unknown[]) => criarParceiroMock(...args),
  excluirContatoParceiro: (...args: unknown[]) => excluirContatoParceiroMock(...args),
  excluirEnderecoParceiro: (...args: unknown[]) => excluirEnderecoParceiroMock(...args),
  excluirParceiro: (...args: unknown[]) => excluirParceiroMock(...args),
  listarParceiros: (...args: unknown[]) => listarParceirosMock(...args),
  obterParceiro: (...args: unknown[]) => obterParceiroMock(...args),
}))

import CadastrosPage from './CadastrosPage'

const parceiroBase = {
  id: 'par-1',
  tipo_pessoa: 'PJ',
  documento: '11222333000144',
  razao_social: 'ACME Ltda',
  nome_fantasia: 'ACME',
  inscricao_estadual: '123',
  email: 'acme@empresa.com',
  telefone: '11999990000',
  eh_cliente: true,
  eh_fornecedor: true,
  eh_parceiro: false,
  ativo: true,
  origem: 'MANUAL',
  contatos: [
    {
      id: 'cont-1',
      parceiro: 'par-1',
      nome: 'Ana Compras',
      cargo: 'Compras',
      email: 'ana@empresa.com',
      telefone: '11988887777',
      principal: true,
      observacoes: 'Contato principal',
    },
  ],
  enderecos: [
    {
      id: 'end-1',
      parceiro: 'par-1',
      nome: 'Matriz',
      logradouro: 'Rua Alfa',
      numero: '100',
      complemento: 'Galpão 2',
      bairro: 'Centro',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01001000',
      principal: true,
    },
  ],
}

function setupCadastrosPage() {
  showToastMock.mockClear()
  listarParceirosMock.mockResolvedValue([parceiroBase])
  obterParceiroMock.mockResolvedValue(parceiroBase)
  atualizarParceiroMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...parceiroBase,
    ...payload,
  }))
  criarParceiroMock.mockResolvedValue(parceiroBase)
  atualizarContatoParceiroMock.mockResolvedValue(parceiroBase.contatos[0])
  criarContatoParceiroMock.mockResolvedValue(parceiroBase.contatos[0])
  atualizarEnderecoParceiroMock.mockResolvedValue(parceiroBase.enderecos[0])
  criarEnderecoParceiroMock.mockResolvedValue(parceiroBase.enderecos[0])
  excluirParceiroMock.mockResolvedValue(undefined)
  excluirContatoParceiroMock.mockResolvedValue(undefined)
  excluirEnderecoParceiroMock.mockResolvedValue(undefined)
}

function renderCadastrosPage() {
  return render(
    <MemoryRouter>
      <CadastrosPage />
    </MemoryRouter>
  )
}

describe('CadastrosPage', () => {
  beforeEach(setupCadastrosPage)

  it('lista parceiro, abre detalhe e salva cadastro', async () => {
    renderCadastrosPage()

    await screen.findByText('ACME Ltda')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await screen.findByText('Ana Compras')
    fireEvent.change(screen.getByLabelText('Razão social'), {
      target: { value: 'ACME Energia Ltda' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))

    await waitFor(() => expect(atualizarParceiroMock).toHaveBeenCalled())
    expect(atualizarParceiroMock).toHaveBeenCalledWith(
      'par-1',
      expect.objectContaining({
        razao_social: 'ACME Energia Ltda',
        eh_cliente: true,
        eh_fornecedor: true,
      })
    )
  })

  it('edita contato e endereco do parceiro selecionado', async () => {
    renderCadastrosPage()

    await screen.findByText('ACME Ltda')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    await screen.findByText('Rua Alfa, 100, Galpão 2, Centro')

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Salvar contato' }))
    await waitFor(() => expect(atualizarContatoParceiroMock).toHaveBeenCalled())
    expect(atualizarContatoParceiroMock).toHaveBeenCalledWith(
      'cont-1',
      expect.objectContaining({ nome: 'Ana Compras', parceiro: 'par-1' })
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1])
    fireEvent.click(screen.getByRole('button', { name: 'Salvar endereço' }))
    await waitFor(() => expect(atualizarEnderecoParceiroMock).toHaveBeenCalled())
    expect(atualizarEnderecoParceiroMock).toHaveBeenCalledWith(
      'end-1',
      expect.objectContaining({ logradouro: 'Rua Alfa', parceiro: 'par-1' })
    )
  })
})
