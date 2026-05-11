import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const showToast = vi.hoisted(() => vi.fn())
const useAuthMock = vi.hoisted(() => vi.fn())
const atualizarParametroConfiguracao = vi.hoisted(() => vi.fn())
const listarParametrosConfiguracao = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('../services/erpApi', () => ({
  atualizarParametroConfiguracao: (...args: unknown[]) =>
    atualizarParametroConfiguracao(...args),
  listarParametrosConfiguracao: (...args: unknown[]) =>
    listarParametrosConfiguracao(...args),
}))

import ConfiguracoesErpPage from './ConfiguracoesErpPage'

function renderPage() {
  render(
    <MemoryRouter>
      <ConfiguracoesErpPage />
    </MemoryRouter>
  )
}

describe('ConfiguracoesErpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      user: authUser(['configuracao_erp.gerenciar']),
    })
    listarParametrosConfiguracao.mockResolvedValue([
      {
        id: 'p1',
        chave: 'orcamento.prefixo',
        valor: 'ORC',
        descricao: 'Prefixo atual',
      },
    ])
    atualizarParametroConfiguracao.mockResolvedValue({
      id: 'p1',
      chave: 'orcamento.prefixo',
      valor: 'PRJ',
      descricao: 'Novo texto',
    })
  })

  it('permite editar e salvar parâmetro quando usuário tem permissão', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Valor de orcamento.prefixo'), {
      target: { value: 'PRJ' },
    })
    fireEvent.change(screen.getByLabelText('Descrição de orcamento.prefixo'), {
      target: { value: '  Novo texto  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(atualizarParametroConfiguracao).toHaveBeenCalledWith('orcamento.prefixo', {
        valor: 'PRJ',
        descricao: 'Novo texto',
      })
    })
    expect(screen.getByText('PRJ')).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith({
      variant: 'success',
      message: 'Parâmetro atualizado.',
    })
  })

  it('renderiza somente leitura sem permissão', async () => {
    useAuthMock.mockReturnValue({ user: authUser([]) })

    renderPage()

    expect(await screen.findByText(/Só visualização/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('mostra vazio e erro de carregamento', async () => {
    listarParametrosConfiguracao.mockRejectedValueOnce(new Error('falhou'))

    renderPage()

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível carregar os parâmetros.' })
      )
    })
    expect(screen.getByText('Nenhum parâmetro registado.')).toBeInTheDocument()
  })

  it('cancela edição e mostra erro ao falhar salvamento', async () => {
    atualizarParametroConfiguracao.mockRejectedValueOnce(new Error('salvar'))

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByLabelText('Valor de orcamento.prefixo')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Não foi possível guardar o parâmetro.' })
      )
    })
  })
})
