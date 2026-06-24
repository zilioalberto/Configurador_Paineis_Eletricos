import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listarMock = vi.fn()
const contagemMock = vi.fn()
const marcarLidaMock = vi.fn()
const marcarTodasMock = vi.fn()

vi.mock('@/services/notificacoesApi', () => ({
  listarNotificacoesInternas: (...a: unknown[]) => listarMock(...a),
  contagemNotificacoesNaoLidas: (...a: unknown[]) => contagemMock(...a),
  marcarNotificacaoLida: (...a: unknown[]) => marcarLidaMock(...a),
  marcarTodasNotificacoesLidas: (...a: unknown[]) => marcarTodasMock(...a),
}))

import NotificacoesHeaderPanel, { useNotificacoesInternas } from './NotificacoesHeaderPanel'

const notificacao = {
  id: 'n1',
  tipo: 'oferta',
  titulo: 'Nova oferta',
  mensagem: 'Cliente respondeu',
  link: 'https://app.local/orcamentos/1',
  referencia_app: 'orcamentos',
  referencia_id: '1',
  lida: false,
  lida_em: null,
  criado_em: '2026-06-04T10:00:00.000Z',
}

describe('useNotificacoesInternas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('atualiza contagem na montagem e via callback manual', async () => {
    contagemMock.mockResolvedValueOnce(2).mockResolvedValueOnce(5)

    const { result } = renderHook(() => useNotificacoesInternas(60_000))

    await waitFor(() => expect(result.current.naoLidas).toBe(2))

    await result.current.atualizarContagem()

    await waitFor(() => expect(result.current.naoLidas).toBe(5))
    expect(contagemMock).toHaveBeenCalledTimes(2)
  })

  it('zera contagem quando API falha', async () => {
    contagemMock.mockRejectedValueOnce(new Error('fail'))

    const { result } = renderHook(() => useNotificacoesInternas())

    await waitFor(() => expect(result.current.naoLidas).toBe(0))
  })
})

describe('NotificacoesHeaderPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não renderiza quando fechado', () => {
    const { container } = render(
      <MemoryRouter>
        <NotificacoesHeaderPanel aberto={false} />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lista notificações e marca item como lido', async () => {
    listarMock.mockResolvedValue([notificacao])
    marcarLidaMock.mockResolvedValue({ ...notificacao, lida: true })
    const onContagemChange = vi.fn()
    const onNavigate = vi.fn()

    render(
      <MemoryRouter>
        <NotificacoesHeaderPanel
          aberto
          onContagemChange={onContagemChange}
          onNavigate={onNavigate}
        />
      </MemoryRouter>
    )

    expect(await screen.findByText('Nova oferta')).toBeInTheDocument()
    expect(onContagemChange).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: /Nova oferta/i }))

    await waitFor(() => expect(marcarLidaMock).toHaveBeenCalledWith('n1'))
    expect(onNavigate).toHaveBeenCalled()
  })

  it('marca todas como lidas', async () => {
    listarMock.mockResolvedValue([notificacao])
    marcarTodasMock.mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <NotificacoesHeaderPanel aberto />
      </MemoryRouter>
    )

    fireEvent.click(await screen.findByRole('button', { name: /Marcar todas como lidas/i }))

    await waitFor(() => expect(marcarTodasMock).toHaveBeenCalled())
  })

  it('mostra estado vazio em erro de rede', async () => {
    listarMock.mockRejectedValue(new Error('fail'))

    render(
      <MemoryRouter>
        <NotificacoesHeaderPanel aberto />
      </MemoryRouter>
    )

    expect(await screen.findByText('Sem alertas no momento.')).toBeInTheDocument()
  })
})
